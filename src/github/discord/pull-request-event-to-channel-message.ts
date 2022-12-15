import {
  PullRequestEvent,
  PullRequestReviewRequestedEvent,
  PullRequestReviewSubmittedEvent,
} from "@octokit/webhooks-types";
import { APIEmbedField, MessageCreateOptions, User } from "discord.js";
import { gitHubUsers } from "../../discord/github/users.js";

type PullRequestWebHookEvent =
  | PullRequestEvent
  | PullRequestReviewSubmittedEvent
  | PullRequestReviewRequestedEvent;

interface MessageOptions {
  taskNumber: number | null;
  discordUser: string | null;
  userAvatarUrl: string;
}

interface MessageReviewOptions extends MessageOptions {
  reviewDiscordUser: string | null;
}

function extractTaskNumberFromPullRequest(
  pullRequest: PullRequestWebHookEvent
) {
  const matches = pullRequest.pull_request.title.match(/\w+\((\d+)\):/);

  if (!matches) {
    return null;
  }

  const taskNumber = Number(matches[1]);

  if (taskNumber === 0) {
    return null;
  }

  return taskNumber;
}

function extractDiscordUserFromPullRequestReview(
  pullRequest: PullRequestReviewSubmittedEvent | PullRequestReviewRequestedEvent
): string | null {
  if (pullRequest.action === "submitted") {
    return (
      gitHubUsers[
        pullRequest.review.user.login as keyof typeof gitHubUsers
      ]?.toString() ?? pullRequest.review.user.login
    );
  }

  if (
    pullRequest.action === "review_requested" &&
    "requested_team" in pullRequest
  ) {
    return null;
  }

  return (
    gitHubUsers[
      pullRequest.requested_reviewer.login as keyof typeof gitHubUsers
    ]?.toString() ?? pullRequest.requested_reviewer.login
  );
}

function transformTaskToDevOpsUrl(taskNumber: number) {
  return `https://dev.azure.com/VPAuto/VPA-Marketplace/_workitems/edit/${taskNumber}`;
}

function extractDiscordUserFromPullRequest(
  pullRequest: PullRequestWebHookEvent
): User | null {
  return (
    gitHubUsers[
      pullRequest.pull_request.user.login as keyof typeof gitHubUsers
    ] ?? null
  );
}

function extractDiscordUserNameFromPullRequest(
  pullRequest: PullRequestWebHookEvent
): string | null {
  return (
    gitHubUsers[
      pullRequest.pull_request.user.login as keyof typeof gitHubUsers
    ]?.toString() ?? pullRequest.pull_request.user.login
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
      value:
        (discordUser ? `${discordUser}` : null) ??
        pullRequest.pull_request.user.login,
    },
  ];

  if (taskNumber) {
    fields.push({
      name: `Tâche #${taskNumber}`,
      value: transformTaskToDevOpsUrl(taskNumber),
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
  let content = "";

  if (pullRequest.review.state === "approved") {
    content = `#${pullRequest.pull_request.number} approuvée${
      reviewDiscordUser ? ` par ${reviewDiscordUser}` : ""
    }`;
  } else if (pullRequest.review.state === "changes_requested") {
    content = `#${pullRequest.pull_request.number} changement demandé${
      reviewDiscordUser ? ` par ${reviewDiscordUser}` : ""
    }`;
  } else if (pullRequest.review.state === "commented") {
    content = `#${pullRequest.pull_request.number} commentée${
      reviewDiscordUser ? ` par ${reviewDiscordUser}` : ""
    }`;
  } else if (pullRequest.review.state === "dismissed") {
    content = `#${pullRequest.pull_request.number} rejetée${
      reviewDiscordUser ? ` par ${reviewDiscordUser}` : ""
    }`;
  } else {
    content = `#${pullRequest.pull_request.number} revue${
      reviewDiscordUser ? ` par ${reviewDiscordUser}` : ""
    }`;
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
): MessageCreateOptions | null {
  if (pullRequest.pull_request.draft) {
    return null;
  }

  const taskNumber = extractTaskNumberFromPullRequest(pullRequest);
  const discordUser = extractDiscordUserNameFromPullRequest(pullRequest);
  const userAvatarUrl =
    extractDiscordUserFromPullRequest(pullRequest)?.avatarURL() ??
    pullRequest.pull_request.user.avatar_url;

  switch (pullRequest.action) {
    case "submitted": {
      const reviewDiscordUser =
        extractDiscordUserFromPullRequestReview(pullRequest);

      return reviewSubmittedPullRequestMessage(pullRequest, {
        taskNumber,
        discordUser,
        reviewDiscordUser,
        userAvatarUrl,
      });
    }
    case "review_requested": {
      const reviewDiscordUser =
        extractDiscordUserFromPullRequestReview(pullRequest);

      return reviewRequestedPullRequestMessage(pullRequest, {
        taskNumber,
        discordUser,
        reviewDiscordUser,
        userAvatarUrl,
      });
    }
    case "opened":
      return openedPullRequestMessage(pullRequest, {
        taskNumber,
        discordUser,
        userAvatarUrl,
      });
    case "closed":
      if (!pullRequest.pull_request.merged) {
        return closedPullRequestMessage(pullRequest, {
          taskNumber,
          discordUser,
          userAvatarUrl,
        });
      }

      return mergedPullRequestMessage(pullRequest, {
        taskNumber,
        discordUser,
        userAvatarUrl,
      });
    default:
      return null;
  }
}
