import { PullRequestEvent } from "@octokit/webhooks-types";
import { APIEmbedField, MessageCreateOptions, User } from "discord.js";
import { gitHubUsers } from "../../discord/github/users.js";

interface MessageOptions {
  taskNumber: number | null;
  discordUser: User | null;
  userAvatarUrl: string;
}

function extractTaskNumberFromPullRequest(pullRequest: PullRequestEvent) {
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

function transformTaskToDevOpsUrl(taskNumber: number) {
  return `https://dev.azure.com/VPAuto/VPA-Marketplace/_workitems/edit/${taskNumber}`;
}

function extractDiscordUserFromPullRequest(
  pullRequest: PullRequestEvent
): User | null {
  return (
    gitHubUsers[
      pullRequest.pull_request.user.login as keyof typeof gitHubUsers
    ] ?? null
  );
}

function openedPullRequestMessage(
  pullRequest: PullRequestEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Nouvelle pull request #${pullRequest.number}`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      discordUser,
      userAvatarUrl,
    }),
  };
}

function mergedPullRequestMessage(
  pullRequest: PullRequestEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageOptions
): MessageCreateOptions {
  return {
    content: `Pull request #${pullRequest.number} complétée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      discordUser,
      userAvatarUrl,
    }),
  };
}

function pullRequestMessageEmbeds(
  pullRequest: PullRequestEvent,
  { taskNumber, discordUser, userAvatarUrl }: MessageOptions
): MessageCreateOptions["embeds"] {
  const fields: APIEmbedField[] = [
    {
      name: "Auteur",
      value: `${discordUser}` ?? pullRequest.pull_request.user.login,
    },
  ];

  if (taskNumber) {
    fields.push({
      name: `Tâche ${taskNumber}`,
      value: transformTaskToDevOpsUrl(taskNumber),
    });
  }

  return [
    {
      title: `#${pullRequest.number} ${pullRequest.pull_request.title} (${pullRequest.repository.full_name})`,
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

function closedPullRequestMessage(
  pullRequest: PullRequestEvent,
  {
    taskNumber,
    discordUser,
    userAvatarUrl,
  }: {
    userAvatarUrl: string;
    discordUser: User | null;
    taskNumber: null | number;
  }
) {
  return {
    content: `Pull request #${pullRequest.number} fermée`,
    embeds: pullRequestMessageEmbeds(pullRequest, {
      taskNumber,
      discordUser,
      userAvatarUrl,
    }),
  };
}

export function pullRequestEventToChannelMessage(
  pullRequest: PullRequestEvent
): MessageCreateOptions | null {
  const taskNumber = extractTaskNumberFromPullRequest(pullRequest);
  const discordUser = extractDiscordUserFromPullRequest(pullRequest);
  const userAvatarUrl =
    discordUser?.avatarURL() ?? pullRequest.pull_request.user.avatar_url;

  if (pullRequest.pull_request.draft) {
    return null;
  }

  switch (pullRequest.action) {
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
