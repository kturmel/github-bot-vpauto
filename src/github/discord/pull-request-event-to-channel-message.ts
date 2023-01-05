import {
  PullRequestEvent,
  PullRequestReviewRequestedEvent,
  PullRequestReviewSubmittedEvent,
} from "@octokit/webhooks-types";
import { APIEmbedField, MessageCreateOptions, User } from "discord.js";
import { gitHubUsers } from "../../discord/github/users.js";
import { O, pipe } from "../../fp-ts.js";

type PullRequestWebHookEvent =
  | PullRequestEvent
  | PullRequestReviewSubmittedEvent
  | PullRequestReviewRequestedEvent;

type PullRequestReviewerRequestedEvent = Extract<
  PullRequestReviewRequestedEvent,
  { requested_reviewer: unknown }
>;

interface MessageOptions {
  taskNumber: O.Option<number>;
  pullRequestOwnerDiscordUser: O.Option<User>;
  messageImageEmbedUrl: string;
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
  pullRequest: PullRequestReviewRequestedEvent
): O.Option<User> {
  if (!isThereAnyRequestedReviewer(pullRequest)) return O.none;

  return O.fromNullable(
    gitHubUsers[
      pullRequest.requested_reviewer.login as keyof typeof gitHubUsers
    ]
  );
}

function extractPullRequestReviewerDiscordUser(
  pullRequest: PullRequestReviewSubmittedEvent | PullRequestReviewRequestedEvent
): O.Option<User> {
  if (pullRequest.action === "submitted") {
    return O.fromNullable(
      gitHubUsers[pullRequest.review.user.login as keyof typeof gitHubUsers]
    );
  }

  if (
    pullRequest.action === "review_requested" &&
    "requested_team" in pullRequest
  ) {
    return O.none;
  }

  return O.fromNullable(
    gitHubUsers[pullRequest.sender.login as keyof typeof gitHubUsers]
  );
}

function extractPullRequestOwnerDiscordUserName(
  pullRequest: PullRequestWebHookEvent
): O.Option<User> {
  return O.fromNullable(
    gitHubUsers[pullRequest.pull_request.user.login as keyof typeof gitHubUsers]
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
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
  }: MessageOptions
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
      image: {
        url: messageImageEmbedUrl,
      },
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
 * @param messageImageEmbedUrl
 */
function openedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
  }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Nouvelle pull request #${pullRequest.pull_request.number}`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser: pullRequestOwnerDiscordUser,
      messageImageEmbedUrl,
    }),
  };
}

/**
 * Handle a pull request event when a Pull Request is merged.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 * @param messageImageEmbedUrl
 */
function mergedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
  }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Pull request #${pullRequest.pull_request.number} complétée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
      messageImageEmbedUrl,
    }),
  };
}

/**
 * Handle a pull request event when there is a review. This can be a review requested, request to review, etc.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 * @param messageImageEmbedUrl
 */
function pullRequestReviewMessageEmbeds(
  pullRequest: PullRequestReviewSubmittedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
  }: MessageReviewOptions
): MessageCreateOptions["embeds"] {
  const embeds = pullRequestMessageEmbeds(pullRequest, {
    taskNumber,
    pullRequestOwnerDiscordUser: pullRequestOwnerDiscordUser,
    messageImageEmbedUrl: messageImageEmbedUrl,
  });

  return embeds?.map((embed) => ({
    ...embed,
    description: `${
      pullRequest.review.body?.slice(0, 1000) ?? "Commentaire indisponible"
    }`,
  }));
}

/**
 * Handle a pull request event when a Pull Request is closed.
 *
 * @param pullRequest
 * @param taskNumber
 * @param pullRequestOwnerDiscordUser
 * @param messageImageEmbedUrl
 */
function closedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
  }: MessageOptions
) {
  return {
    content: `Pull request #${pullRequest.pull_request.number} fermée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
      messageImageEmbedUrl,
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
 * @param messageImageEmbedUrl
 * @param pullRequestReviewerDiscordUser
 */
function reviewSubmittedPullRequestMessage(
  pullRequest: PullRequestReviewSubmittedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
    pullRequestReviewerDiscordUser,
  }: MessageReviewOptions
) {
  let content: string;
  const reviewerDiscordUser = O.isSome(pullRequestReviewerDiscordUser)
    ? ` par ${pullRequestReviewerDiscordUser.value.toString()}`
    : "";

  if (pullRequest.review.state === "approved") {
    content = `#${pullRequest.pull_request.number} approuvée${reviewerDiscordUser}`;
  } else if (pullRequest.review.state === "changes_requested") {
    content = `#${pullRequest.pull_request.number} changement demandé${reviewerDiscordUser}`;
  } else if (pullRequest.review.state === "commented") {
    content = `#${pullRequest.pull_request.number} commentée${reviewerDiscordUser}`;
  } else if (pullRequest.review.state === "dismissed") {
    content = `#${pullRequest.pull_request.number} rejetée${reviewerDiscordUser}`;
  } else {
    content = `#${pullRequest.pull_request.number} revue${reviewerDiscordUser}`;
  }

  return {
    content,
    embeds: pullRequestReviewMessageEmbeds(pullRequest, {
      taskNumber,
      pullRequestOwnerDiscordUser,
      messageImageEmbedUrl,
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
 * @param messageImageEmbedUrl
 * @param pullRequestReviewerDiscordUser
 */
function pullRequestRequestedMessageEmbeds(
  pullRequest: PullRequestReviewRequestedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
    pullRequestReviewerDiscordUser,
  }: MessageReviewOptions
) {
  const embeds = pullRequestMessageEmbeds(pullRequest, {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
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
 * @param messageImageEmbedUrl
 * @param pullRequestReviewerDiscordUser
 * @param pullRequestRequestedReviewerDiscordUser
 */
function reviewRequestedReviewerPullRequestMessage(
  pullRequest: PullRequestReviewerRequestedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
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
      messageImageEmbedUrl,
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
 * @param messageImageEmbedUrl
 * @param pullRequestReviewerDiscordUser - Discord user of the pull request reviewer
 */
function reviewRequestedChangesPullRequestMessage(
  pullRequest: PullRequestReviewRequestedEvent,
  {
    taskNumber,
    pullRequestOwnerDiscordUser,
    messageImageEmbedUrl,
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
      messageImageEmbedUrl,
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
 * @param pullRequest - The pull request to handle
 */
export function pullRequestEventToChannelMessage(
  pullRequest: PullRequestWebHookEvent
): O.Option<MessageCreateOptions> {
  if (pullRequest.pull_request.draft) {
    return O.none;
  }

  const taskNumber = extractTaskNumberFromPullRequest(pullRequest);
  const pullRequestOwnerDiscordUser =
    extractPullRequestOwnerDiscordUserName(pullRequest);
  const userAvatarUrl = pipe(
    pullRequestOwnerDiscordUser,
    O.map((user) => O.fromNullable(user.avatarURL())),
    O.flatten,
    O.getOrElse(() => pullRequest.pull_request.user.avatar_url)
  );

  switch (pullRequest.action) {
    case "submitted": {
      const pullRequestReviewerDiscordUser =
        extractPullRequestReviewerDiscordUser(pullRequest);

      return O.some(
        reviewSubmittedPullRequestMessage(pullRequest, {
          taskNumber,
          pullRequestOwnerDiscordUser,
          pullRequestReviewerDiscordUser,
          messageImageEmbedUrl: userAvatarUrl,
        })
      );
    }
    case "review_requested": {
      const pullRequestReviewerDiscordUser =
        extractPullRequestReviewerDiscordUser(pullRequest);

      if (isThereAnyRequestedReviewer(pullRequest)) {
        const pullRequestRequestedReviewerDiscordUser =
          extractPullRequestRequestedReviewerDiscordUser(pullRequest);

        return O.some(
          reviewRequestedReviewerPullRequestMessage(pullRequest, {
            taskNumber,
            pullRequestOwnerDiscordUser,
            pullRequestReviewerDiscordUser,
            pullRequestRequestedReviewerDiscordUser,
            messageImageEmbedUrl: userAvatarUrl,
          })
        );
      }

      return O.some(
        reviewRequestedChangesPullRequestMessage(pullRequest, {
          taskNumber,
          pullRequestOwnerDiscordUser,
          pullRequestReviewerDiscordUser,
          messageImageEmbedUrl: userAvatarUrl,
        })
      );
    }
    case "opened":
      return O.some(
        openedPullRequestMessage(pullRequest, {
          taskNumber,
          pullRequestOwnerDiscordUser,
          messageImageEmbedUrl: userAvatarUrl,
        })
      );
    case "closed":
      return O.some(
        pullRequest.pull_request.merged
          ? mergedPullRequestMessage(pullRequest, {
              taskNumber,
              pullRequestOwnerDiscordUser,
              messageImageEmbedUrl: userAvatarUrl,
            })
          : closedPullRequestMessage(pullRequest, {
              taskNumber,
              pullRequestOwnerDiscordUser,
              messageImageEmbedUrl: userAvatarUrl,
            })
      );
    default:
      return O.none;
  }
}
