import {
  PullRequestEvent,
  PullRequestReviewCommentCreatedEvent,
  PullRequestReviewRequestedEvent,
  PullRequestReviewSubmittedEvent,
} from "@octokit/webhooks-types";
import { APIEmbedField, MessageCreateOptions, User } from "discord.js";
import {
  getGithubUsers,
  GitHubUsernames,
  GitHubUsers,
} from "../../discord/github/users.js";
import { O } from "../../fp-ts.js";
import { match, P } from "ts-pattern";

type PullRequestWebHookEvent =
  | PullRequestEvent
  | PullRequestReviewSubmittedEvent
  | PullRequestReviewCommentCreatedEvent
  | PullRequestReviewRequestedEvent;

type PullRequestReviewSubmittedEventWithoutComment = Omit<
  PullRequestReviewSubmittedEvent,
  "review"
> & {
  review: Omit<PullRequestReviewSubmittedEvent["review"], "state"> & {
    state: Exclude<
      PullRequestReviewSubmittedEvent["review"]["state"],
      "commented"
    >;
  };
};

type PullRequestReviewerRequestedEvent = Extract<
  PullRequestReviewRequestedEvent,
  { requested_reviewer: unknown }
>;

interface MessageOptions {
  taskNumber: O.Option<number>;
  pullRequestOwnerDiscordUser: O.Option<User>;
}

interface MessageReviewOptions extends MessageOptions {
  pullRequestReviewerDiscordUser: O.Option<User>;
}

interface MessageRequestReviewOptions extends MessageReviewOptions {
  pullRequestRequestedReviewerDiscordUser: O.Option<User>;
}

function isThereAnyRequestedReviewer(
  pullRequest: PullRequestWebHookEvent
): pullRequest is PullRequestReviewerRequestedEvent {
  if (pullRequest.action !== "review_requested") return false;

  return !("requested_team" in pullRequest);
}

/**
 * Get the task number from a pull request title.
 *
 * @example `fix(#task): commit message`
 * @example `feat(#120): commit message`
 *
 * @param pullRequest
 */
function extractTaskNumberFromPullRequest(
  pullRequest: PullRequestWebHookEvent
): O.Option<number> {
  const matches = O.fromNullable(
    pullRequest.pull_request.title.match(/\w+\((\d+)\):/)
  );

  if (O.isNone(matches)) return O.none;

  const taskNumber = Number(matches.value[1]);

  if (Number.isNaN(taskNumber)) return O.none;

  if (taskNumber === 0) {
    return O.none;
  }

  return O.some(taskNumber);
}

function extractPullRequestRequestedReviewerDiscordUser(
  pullRequest: PullRequestReviewRequestedEvent,
  githubUsers: GitHubUsers
): O.Option<User> {
  if (!isThereAnyRequestedReviewer(pullRequest)) return O.none;

  return O.fromNullable(
    githubUsers[pullRequest.requested_reviewer.login as GitHubUsernames]
  );
}

function extractPullRequestReviewerDiscordUser(
  pullRequest:
    | PullRequestReviewSubmittedEventWithoutComment
    | PullRequestReviewRequestedEvent
    | PullRequestReviewCommentCreatedEvent,
  githubUsers: GitHubUsers
): O.Option<User> {
  return match(pullRequest)
    .with(
      {
        action: "submitted",
      },
      (p) => O.fromNullable(githubUsers[p.review.user.login as GitHubUsernames])
    )
    .with(
      {
        action: "review_requested",
        requested_team: P.any,
      },
      () => O.none
    )
    .with(P._, (p) =>
      O.fromNullable(githubUsers[p.sender.login as GitHubUsernames])
    )
    .exhaustive();
}

function extractPullRequestOwnerDiscordUserName(
  pullRequest: PullRequestWebHookEvent,
  githubUsers: GitHubUsers
): O.Option<User> {
  return O.fromNullable(
    githubUsers[pullRequest.pull_request.user.login as GitHubUsernames]
  );
}

/**
 * Get the DevOps url for a task.
 *
 * @param taskNumber
 */
function transformTaskToDevOpsUrl(taskNumber: number) {
  return `https://dev.azure.com/VPAuto/VPA-Marketplace/_workitems/edit/${taskNumber}`;
}

function pullRequestMessageEmbeds(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageOptions
): MessageCreateOptions["embeds"] {
  const fields: APIEmbedField[] = [
    {
      name: "Auteur",
      value: O.isSome(pullRequestOwnerDiscordUser)
        ? pullRequestOwnerDiscordUser.value.toString()
        : pullRequest.pull_request.user.login,
    },
  ];

  if (O.isSome(taskNumber)) {
    fields.push({
      name: `Tâche #${taskNumber.value}`,
      value: transformTaskToDevOpsUrl(taskNumber.value),
    });
  }

  return [
    {
      title: `#${pullRequest.pull_request.number} — ${pullRequest.pull_request.title} (${pullRequest.repository.full_name})`,
      description:
        pullRequest.pull_request.body?.slice(0, 3000) ?? "Aucune description",
      fields,
      url: pullRequest.pull_request.html_url,
    },
  ];
}

/**
 * Handle a pull request event when a Pull Request is opened.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 */
function openedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Nouvelle pull request #${pullRequest.pull_request.number}`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser: pullRequestOwnerDiscordUser,
    }),
  };
}

/**
 * Handle a pull request event when a Pull Request is merged.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 */
function mergedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Pull request #${pullRequest.pull_request.number} complétée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
    }),
  };
}

/**
 * Handle a pull request event when there is a review. This can be a review requested, request to review, etc.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 */
function pullRequestReviewMessageEmbeds(
  pullRequest:
    | PullRequestReviewSubmittedEvent
    | PullRequestReviewCommentCreatedEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageReviewOptions
): MessageCreateOptions["embeds"] {
  const embeds = pullRequestMessageEmbeds(pullRequest, {
    taskNumber,
    pullRequestOwnerDiscordUser: pullRequestOwnerDiscordUser,
  });

  const description =
    match(pullRequest)
      .with({ review: P.any }, (p) => p.review.body?.slice(0, 1000))
      .with({ comment: P.any }, (p) => p.comment.body?.slice(0, 1000))
      .exhaustive() ?? "Commentaire indisponible";

  return embeds?.map((embed) => ({
    ...embed,
    description,
  }));
}

/**
 * Handle a pull request event when a Pull Request is closed.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 */
function closedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageOptions
) {
  return {
    content: `Pull request #${pullRequest.pull_request.number} fermée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
    }),
  };
}

/**
 * Handle pull request review submitted event. This event is triggered when a
 * pull request review is submitted.
 * Such events are triggered when a pull request is approved, changes requested, commented or dismissed/rejected.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 * @param pullRequestReviewerDiscordUser
 */
function reviewSubmittedPullRequestMessage(
  pullRequest:
    | PullRequestReviewSubmittedEventWithoutComment
    | PullRequestReviewCommentCreatedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    pullRequestReviewerDiscordUser,
  }: MessageReviewOptions
) {
  const reviewerDiscordUser = O.isSome(pullRequestReviewerDiscordUser)
    ? ` par ${pullRequestReviewerDiscordUser.value.toString()}`
    : "";

  const content = match(pullRequest)
    .with(
      { review: { state: "approved" } },
      (p) => `#${p.pull_request.number} approuvée${reviewerDiscordUser}`
    )
    .with(
      { review: { state: "changes_requested" } },
      (p) =>
        `#${p.pull_request.number} changement demandé${reviewerDiscordUser}`
    )
    .with(
      { review: { state: "dismissed" } },
      (p) => `#${p.pull_request.number} rejetée${reviewerDiscordUser}`
    )
    .with(
      { comment: P.any },
      (p) => `#${p.pull_request.number} commentée${reviewerDiscordUser}`
    )
    .exhaustive();

  return {
    content,
    embeds: pullRequestReviewMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
      pullRequestReviewerDiscordUser,
    }),
  };
}

/**
 * Handle the new Discord message Embeds for review requested events.
 * Embeds display the description of the pull request, the DevOps Task Number and the Discord user of the pull request owner.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 * @param pullRequestReviewerDiscordUser
 */
function pullRequestRequestedMessageEmbeds(
  pullRequest: PullRequestReviewRequestedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    pullRequestReviewerDiscordUser,
  }: MessageReviewOptions
) {
  const embeds = pullRequestMessageEmbeds(pullRequest, {
    taskNumber,
    pullRequestOwnerDiscordUser,
  });

  if ("requested_team" in pullRequest) {
    return embeds?.map((embed) => ({
      ...embed,
      description: `Demande par l'équipe ${pullRequest.requested_team.name}`,
    }));
  }

  return embeds?.map((embed) => ({
    ...embed,
    description: O.isSome(pullRequestReviewerDiscordUser)
      ? `Demande par ${pullRequestReviewerDiscordUser.value.toString()}`
      : undefined,
  }));
}

/**
 * Handle a pull request review requested event. This event is triggered when a user is requested to review a pull request.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 * @param pullRequestReviewerDiscordUser
 * @param pullRequestRequestedReviewerDiscordUser
 */
function reviewRequestedReviewerPullRequestMessage(
  pullRequest: PullRequestReviewerRequestedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    pullRequestReviewerDiscordUser,
    pullRequestRequestedReviewerDiscordUser,
  }: MessageRequestReviewOptions
) {
  return {
    content: `${
      O.isSome(pullRequestReviewerDiscordUser)
        ? pullRequestReviewerDiscordUser.value.toString()
        : pullRequest.requested_reviewer.login
    } demande une revue${
      O.isSome(pullRequestRequestedReviewerDiscordUser)
        ? ` de ${pullRequestRequestedReviewerDiscordUser.value.toString()}`
        : ""
    } sur #${pullRequest.pull_request.number}`,
    embeds: pullRequestRequestedMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
      pullRequestReviewerDiscordUser,
    }),
  };
}

/**
 * Handle a pull request review requested event. This event is triggered when a user requests changes in a pull request.
 *
 * @param pullRequest - the pull request review_requested
 * @param taskNumber - the task number
 * @param pullRequestOwnerDiscordUser - Discord user of the pull request owner
 * @param pullRequestReviewerDiscordUser - Discord user of the pull request reviewer
 */
function reviewRequestedChangesPullRequestMessage(
  pullRequest: PullRequestReviewRequestedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    pullRequestReviewerDiscordUser,
  }: MessageReviewOptions
) {
  return {
    content: `Changement requis sur #${pullRequest.pull_request.number}${
      O.isSome(pullRequestOwnerDiscordUser)
        ? ` pour ${pullRequestOwnerDiscordUser.value.toString()}`
        : ""
    }${
      O.isSome(pullRequestReviewerDiscordUser)
        ? ` par ${pullRequestReviewerDiscordUser.value.toString()}`
        : ""
    }`,
    embeds: pullRequestRequestedMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
      pullRequestReviewerDiscordUser,
    }),
  };
}

/**
 * Handle a pull request event.
 * Get DevOps task number in pull request title.
 * Get Discord user from GitHub user.
 *
 * Events:
 *  - opened
 *  - closed
 *  - comment
 *  - approved
 *  - user request a review
 *  - user request changes
 *
 * @param gitHubUsers
 */
export const webhookEventToChannelMessage =
  (gitHubUsers: GitHubUsers) =>
  /**
   *
   *
   * @param pullRequest - The pull request to handle
   */
  (pullRequest: PullRequestWebHookEvent): O.Option<MessageCreateOptions> => {
    if (pullRequest.pull_request.draft) {
      return O.none;
    }

    const taskNumber = extractTaskNumberFromPullRequest(pullRequest);
    const pullRequestOwnerDiscordUser = extractPullRequestOwnerDiscordUserName(
      pullRequest,
      gitHubUsers
    );

    return match(pullRequest)
      .with(
        {
          action: "submitted",
          review: {
            state: "commented",
          },
        },
        // TODO: handle review submitted with comment (no changes requested, no approval)
        // TODO: change fp-ts to use ts-results for better error handling, and remove fp programing
        () => O.none
      )
      .with(
        {
          action: "submitted",
        },
        (p: PullRequestReviewSubmittedEventWithoutComment) => {
          const pullRequestReviewerDiscordUser =
            extractPullRequestReviewerDiscordUser(p, gitHubUsers);

          return O.some(
            reviewSubmittedPullRequestMessage(p, {
              taskNumber,
              pullRequestOwnerDiscordUser,
              pullRequestReviewerDiscordUser,
            })
          );
        }
      )
      .with({ action: "review_requested" }, (p) => {
        const pullRequestReviewerDiscordUser =
          extractPullRequestReviewerDiscordUser(p, gitHubUsers);

        if (isThereAnyRequestedReviewer(p)) {
          const pullRequestRequestedReviewerDiscordUser =
            extractPullRequestRequestedReviewerDiscordUser(p, gitHubUsers);

          return O.some(
            reviewRequestedReviewerPullRequestMessage(p, {
              taskNumber,
              pullRequestOwnerDiscordUser,
              pullRequestReviewerDiscordUser,
              pullRequestRequestedReviewerDiscordUser,
            })
          );
        }

        return O.some(
          reviewRequestedChangesPullRequestMessage(p, {
            taskNumber,
            pullRequestOwnerDiscordUser,
            pullRequestReviewerDiscordUser,
          })
        );
      })
      .with({ action: "opened" }, (p) =>
        O.some(
          openedPullRequestMessage(p, {
            taskNumber,
            pullRequestOwnerDiscordUser,
          })
        )
      )
      .with({ action: "closed" }, (p) =>
        O.some(
          p.pull_request.merged
            ? mergedPullRequestMessage(pullRequest, {
                taskNumber,
                pullRequestOwnerDiscordUser,
              })
            : closedPullRequestMessage(pullRequest, {
                taskNumber,
                pullRequestOwnerDiscordUser,
              })
        )
      )
      .with({ action: "created" }, (p) => {
        const pullRequestReviewerDiscordUser =
          extractPullRequestReviewerDiscordUser(p, gitHubUsers);

        return O.some(
          reviewSubmittedPullRequestMessage(p, {
            taskNumber,
            pullRequestOwnerDiscordUser,
            pullRequestReviewerDiscordUser,
          })
        );
      })
      .with(P._, () => O.none)
      .exhaustive();
  };
