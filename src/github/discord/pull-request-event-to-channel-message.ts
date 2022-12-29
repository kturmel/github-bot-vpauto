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

interface MessageOptions {
  taskNumber: O.Option<number>;
  discordUser: O.Option<User>;
  userAvatarUrl: string;
}

interface MessageReviewOptions extends MessageOptions {
  reviewDiscordUser: O.Option<User>;
}

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

function extractDiscordUserFromPullRequestReview(
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
    gitHubUsers[
      pullRequest.requested_reviewer.login as keyof typeof gitHubUsers
    ]
  );
}

function transformTaskToDevOpsUrl(taskNumber: number) {
  return `https://dev.azure.com/VPAuto/VPA-Marketplace/_workitems/edit/${taskNumber}`;
}

function extractDiscordUserFromPullRequest(
  pullRequest: PullRequestWebHookEvent
): O.Option<User> {
  return O.fromNullable(
    gitHubUsers[pullRequest.pull_request.user.login as keyof typeof gitHubUsers]
  );
}

function extractDiscordUserNameFromPullRequest(
  pullRequest: PullRequestWebHookEvent
): O.Option<User> {
  return O.fromNullable(
    gitHubUsers[pullRequest.pull_request.user.login as keyof typeof gitHubUsers]
  );
}

function openedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Nouvelle pull request #${pullRequest.pull_request.number}`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      discordUser,
      userAvatarUrl,
    }),
  };
}

function mergedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Pull request #${pullRequest.pull_request.number} complétée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      discordUser,
      userAvatarUrl,
    }),
  };
}

function pullRequestMessageEmbeds(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageOptions
): MessageCreateOptions["embeds"] {
  const fields: APIEmbedField[] = [
    {
      name: "Auteur",
      value: O.isSome(discordUser)
        ? discordUser.value.toString()
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
        url: userAvatarUrl,
      },
      fields,
      url: pullRequest.pull_request.html_url,
    },
  ];
}

function pullRequestReviewMessageEmbeds(
  pullRequest: PullRequestReviewSubmittedEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageReviewOptions
): MessageCreateOptions["embeds"] {
  const embeds = pullRequestMessageEmbeds(pullRequest, {
    taskNumber,
    discordUser,
    userAvatarUrl,
  });

  return embeds?.map((embed) => ({
    ...embed,
    description: `${
      pullRequest.review.body?.slice(0, 1000) ?? "Commentaire indisponible"
    }`,
  }));
}

function closedPullRequestMessage(
  pullRequest: PullRequestWebHookEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageOptions
) {
  return {
    content: `Pull request #${pullRequest.pull_request.number} fermée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      discordUser,
      userAvatarUrl,
    }),
  };
}

function reviewSubmittedPullRequestMessage(
  pullRequest: PullRequestReviewSubmittedEvent,
  {
    taskNumber,
    discordUser,
    userAvatarUrl,
    reviewDiscordUser,
  }: MessageReviewOptions
) {
  let content: string;
  const reviewerDiscordUser = O.isSome(reviewDiscordUser)
    ? ` par ${reviewDiscordUser.value.toString()}`
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
      discordUser,
      userAvatarUrl,
      reviewDiscordUser,
    }),
  };
}

function pullRequestRequestedMessageEmbeds(
  pullRequest: PullRequestReviewRequestedEvent,
  {
    taskNumber,
    discordUser,
    userAvatarUrl,
    reviewDiscordUser,
  }: MessageReviewOptions
) {
  const embeds = pullRequestMessageEmbeds(pullRequest, {
    taskNumber,
    discordUser,
    userAvatarUrl,
  });

  if ("requested_team" in pullRequest) {
    return embeds?.map((embed) => ({
      ...embed,
      description: `Demande par l'équipe ${pullRequest.requested_team.name}`,
    }));
  }

  return embeds?.map((embed) => ({
    ...embed,
    description: reviewDiscordUser
      ? `Demande par ${reviewDiscordUser}`
      : undefined,
  }));
}

function reviewRequestedPullRequestMessage(
  pullRequest: PullRequestReviewRequestedEvent,
  {
    taskNumber,
    discordUser,
    userAvatarUrl,
    reviewDiscordUser,
  }: MessageReviewOptions
) {
  return {
    content: `Changement requis sur #${pullRequest.pull_request.number}${
      discordUser ? ` pour ${discordUser}` : ""
    } ${reviewDiscordUser ? ` par ${reviewDiscordUser}` : ""}`,
    embeds: pullRequestRequestedMessageEmbeds(pullRequest, {
      taskNumber,
      discordUser,
      userAvatarUrl,
      reviewDiscordUser,
    }),
  };
}

export function pullRequestEventToChannelMessage(
  pullRequest: PullRequestWebHookEvent
): O.Option<MessageCreateOptions> {
  if (pullRequest.pull_request.draft) {
    return O.none;
  }

  const taskNumber = extractTaskNumberFromPullRequest(pullRequest);
  const discordUser = extractDiscordUserNameFromPullRequest(pullRequest);
  const userAvatarUrl = pipe(
    extractDiscordUserFromPullRequest(pullRequest),
    O.map((user) => O.fromNullable(user.avatarURL())),
    O.flatten,
    O.getOrElse(() => pullRequest.pull_request.user.avatar_url)
  );

  switch (pullRequest.action) {
    case "submitted": {
      const reviewDiscordUser =
        extractDiscordUserFromPullRequestReview(pullRequest);

      return O.some(
        reviewSubmittedPullRequestMessage(pullRequest, {
          taskNumber,
          discordUser,
          reviewDiscordUser,
          userAvatarUrl,
        })
      );
    }
    case "review_requested": {
      const reviewDiscordUser =
        extractDiscordUserFromPullRequestReview(pullRequest);

      return O.some(
        reviewRequestedPullRequestMessage(pullRequest, {
          taskNumber,
          discordUser,
          reviewDiscordUser,
          userAvatarUrl,
        })
      );
    }
    case "opened":
      return O.some(
        openedPullRequestMessage(pullRequest, {
          taskNumber,
          discordUser,
          userAvatarUrl,
        })
      );
    case "closed":
      return O.some(
        pullRequest.pull_request.merged
          ? mergedPullRequestMessage(pullRequest, {
              taskNumber,
              discordUser,
              userAvatarUrl,
            })
          : closedPullRequestMessage(pullRequest, {
              taskNumber,
              discordUser,
              userAvatarUrl,
            })
      );
    default:
      return O.none;
  }
}
