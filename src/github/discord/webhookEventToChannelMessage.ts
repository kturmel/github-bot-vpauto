import {
  PullRequestEvent,
  PullRequestReviewCommentCreatedEvent,
  PullRequestReviewRequestedEvent,
  PullRequestReviewSubmittedEvent,
} from "@octokit/webhooks-types";
import { MessageCreateOptions, User, EmbedBuilder } from "discord.js";
import { GitHubUsernames, githubUsers } from "../../discord/github/users.js";
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

type MessageOptions = {
  taskNumber: number | undefined;
  pullRequestOwnerDiscordUser: User | undefined;
};

type MessageReviewOptions = MessageOptions & {
  pullRequestReviewerDiscordUser: User | undefined;
};

type MessageRequestReviewOptions = MessageReviewOptions & {
  pullRequestRequestedReviewerDiscordUser: User | undefined;
};

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
function extractTaskNumber(
  pullRequest: PullRequestWebHookEvent
): number | undefined {
  const matches =
    pullRequest.pull_request.title.match(/\w+\((\d+)\):/) ?? undefined;

  if (matches === undefined) {
    return undefined;
  }

  const taskNumber = Number(matches[1]);

  if (Number.isNaN(taskNumber) || taskNumber === 0) {
    return undefined;
  }

  return taskNumber;
}

function getDiscordUserFromRequestedReviewer(
  pullRequest: PullRequestReviewRequestedEvent
): User | undefined {
  if (!isThereAnyRequestedReviewer(pullRequest)) return undefined;

  return (
    githubUsers[pullRequest.requested_reviewer.login as GitHubUsernames] ??
    undefined
  );
}

function getDiscordUserFromReviewer(
  pullRequest:
    | PullRequestReviewSubmittedEventWithoutComment
    | PullRequestReviewRequestedEvent
    | PullRequestReviewCommentCreatedEvent
): User | undefined {
  return match(pullRequest)
    .with(
      {
        action: "submitted",
      },
      (p) => githubUsers[p.review.user.login as GitHubUsernames] ?? undefined
    )
    .with(
      {
        action: "review_requested",
        requested_team: P.any,
      },
      () => undefined
    )
    .otherwise(
      (p) => githubUsers[p.sender.login as GitHubUsernames] ?? undefined
    );
}

function getDiscordUserFromOwner(
  pullRequest: PullRequestWebHookEvent
): User | undefined {
  return (
    githubUsers[pullRequest.pull_request.user.login as GitHubUsernames] ??
    undefined
  );
}

/**
 * Create the DevOps url for a task.
 *
 * @param taskNumber
 */
function createTaskUrlFromTaskNumber(taskNumber: number) {
  return `https://dev.azure.com/VPAuto/VPA-Marketplace/_workitems/edit/${taskNumber}`;
}

function createMessageEmbeds(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageOptions
) {
  const embed = new EmbedBuilder({
    title: `#${pullRequest.pull_request.number} — ${pullRequest.pull_request.title} (${pullRequest.repository.full_name})`,
    description:
      pullRequest.pull_request.body?.slice(0, 3000) ??
      "Aucune description fournie",
    url: pullRequest.pull_request.html_url,
  }).addFields([
    {
      name: "Auteur",
      value: pullRequestOwnerDiscordUser
        ? pullRequestOwnerDiscordUser.toString()
        : pullRequest.pull_request.user.login,
    },
  ]);

  if (taskNumber !== undefined) {
    embed.addFields([
      {
        name: `Tâche #${taskNumber}`,
        value: createTaskUrlFromTaskNumber(taskNumber),
      },
    ]);
  }

  return embed;
}

/**
 * Handle a pull request event when a Pull Request is opened.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 */
function createOpenedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Nouvelle pull request #${pullRequest.pull_request.number}`,
    embeds: [
      createMessageEmbeds(pullRequest, {
        taskNumber,
        pullRequestOwnerDiscordUser: pullRequestOwnerDiscordUser,
      }),
    ],
  };
}

/**
 * Handle a pull request event when a Pull Request is merged.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 */
function createMergedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Pull request #${pullRequest.pull_request.number} complétée`,
    embeds: [
      createMessageEmbeds(pullRequest, {
        taskNumber,
        pullRequestOwnerDiscordUser,
      }),
    ],
  };
}

/**
 * Handle a pull request event when there is a review. This can be a review requested, request to review, etc.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 */
function createReviewMessageEmbeds(
  pullRequest:
    | PullRequestReviewSubmittedEvent
    | PullRequestReviewCommentCreatedEvent,
  { taskNumber, pullRequestOwnerDiscordUser }: MessageReviewOptions
) {
  const embed = createMessageEmbeds(pullRequest, {
    taskNumber,
    pullRequestOwnerDiscordUser: pullRequestOwnerDiscordUser,
  });

  const description =
    match(pullRequest)
      .with({ review: P.any }, (p) => p.review.body?.slice(0, 1000))
      .with({ comment: P.any }, (p) => p.comment.body?.slice(0, 1000))
      .exhaustive() ?? "Commentaire indisponible";

  return embed.setDescription(description);
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
): MessageCreateOptions {
  return {
    content: `Pull request #${pullRequest.pull_request.number} fermée`,
    embeds: [
      createMessageEmbeds(pullRequest, {
        taskNumber,
        pullRequestOwnerDiscordUser,
      }),
    ],
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
): MessageCreateOptions {
  const reviewerDiscordUser = pullRequestReviewerDiscordUser
    ? ` par ${pullRequestReviewerDiscordUser.toString()}`
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
    embeds: [
      createReviewMessageEmbeds(pullRequest, {
        taskNumber,
        pullRequestOwnerDiscordUser,
        pullRequestReviewerDiscordUser,
      }),
    ],
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
  const embed = createMessageEmbeds(pullRequest, {
    taskNumber,
    pullRequestOwnerDiscordUser,
  });

  if ("requested_team" in pullRequest) {
    return embed.setDescription(
      `Demande par l'équipe ${pullRequest.requested_team.name}`
    );
  }

  return embed.setDescription(
    pullRequestReviewerDiscordUser
      ? `Demande par ${pullRequestReviewerDiscordUser.toString()}`
      : null
  );
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
): MessageCreateOptions {
  return {
    content: `${
      pullRequestReviewerDiscordUser
        ? pullRequestReviewerDiscordUser.toString()
        : pullRequest.requested_reviewer.login
    } demande une revue${
      pullRequestRequestedReviewerDiscordUser
        ? ` de ${pullRequestRequestedReviewerDiscordUser.toString()}`
        : ""
    } sur #${pullRequest.pull_request.number}`,
    embeds: [
      pullRequestRequestedMessageEmbeds(pullRequest, {
        taskNumber,
        pullRequestOwnerDiscordUser,
        pullRequestReviewerDiscordUser,
      }),
    ],
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
): MessageCreateOptions {
  return {
    content: `Changement requis sur #${pullRequest.pull_request.number}${
      pullRequestOwnerDiscordUser
        ? ` pour ${pullRequestOwnerDiscordUser.toString()}`
        : ""
    }${
      pullRequestReviewerDiscordUser
        ? ` par ${pullRequestReviewerDiscordUser.toString()}`
        : ""
    }`,
    embeds: [
      pullRequestRequestedMessageEmbeds(pullRequest, {
        taskNumber,
        pullRequestOwnerDiscordUser,
        pullRequestReviewerDiscordUser,
      }),
    ],
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
 * @param pullRequest - The pull request to handle
 */
export const webhookEventToChannelMessage = (
  pullRequest: PullRequestWebHookEvent
): MessageCreateOptions | undefined => {
  if (pullRequest.pull_request.draft) {
    return undefined;
  }

  const taskNumber = extractTaskNumber(pullRequest);
  const pullRequestOwnerDiscordUser = getDiscordUserFromOwner(pullRequest);

  return match(pullRequest)
    .with(
      {
        action: "submitted",
        review: {
          state: "commented",
        },
      },
      // TODO: handle new comment without any review
      () => undefined
    )
    .with(
      {
        action: "submitted",
      },
      (p: PullRequestReviewSubmittedEventWithoutComment) => {
        const pullRequestReviewerDiscordUser = getDiscordUserFromReviewer(p);

        return reviewSubmittedPullRequestMessage(p, {
          taskNumber,
          pullRequestOwnerDiscordUser,
          pullRequestReviewerDiscordUser,
        });
      }
    )
    .with({ action: "review_requested" }, (p) => {
      const pullRequestReviewerDiscordUser = getDiscordUserFromReviewer(p);

      if (isThereAnyRequestedReviewer(p)) {
        const pullRequestRequestedReviewerDiscordUser =
          getDiscordUserFromRequestedReviewer(p);

        return reviewRequestedReviewerPullRequestMessage(p, {
          taskNumber,
          pullRequestOwnerDiscordUser,
          pullRequestReviewerDiscordUser,
          pullRequestRequestedReviewerDiscordUser,
        });
      }

      return reviewRequestedChangesPullRequestMessage(p, {
        taskNumber,
        pullRequestOwnerDiscordUser,
        pullRequestReviewerDiscordUser,
      });
    })
    .with({ action: "opened" }, (p) =>
      createOpenedPullRequestMessage(p, {
        taskNumber,
        pullRequestOwnerDiscordUser,
      })
    )
    .with({ action: "closed" }, (p) =>
      p.pull_request.merged
        ? createMergedPullRequestMessage(pullRequest, {
            taskNumber,
            pullRequestOwnerDiscordUser,
          })
        : closedPullRequestMessage(pullRequest, {
            taskNumber,
            pullRequestOwnerDiscordUser,
          })
    )
    .with({ action: "created" }, (p) => {
      const pullRequestReviewerDiscordUser = getDiscordUserFromReviewer(p);

      return reviewSubmittedPullRequestMessage(p, {
        taskNumber,
        pullRequestOwnerDiscordUser,
        pullRequestReviewerDiscordUser,
      });
    })
    .otherwise(() => undefined);
};
