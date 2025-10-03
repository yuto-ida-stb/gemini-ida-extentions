/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { icebreakers } from './icebreakers.js';

const server = new McpServer({
  name: 'prompt-server',
  version: '1.0.0',
});

server.registerTool(
  'fetch_posts',
  {
    description: 'Fetches a list of posts from a public API.',
    inputSchema: z.object({}).shape,
  },
  async () => {
    interface Post {
      userId: number;
      id: number;
      title: string;
      body: string;
    }

    const apiResponse = await fetch(
      'https://jsonplaceholder.typicode.com/posts',
    );
    const posts = await apiResponse.json() as Post[];
    const response = { posts: posts.slice(0, 5) };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response),
        },
      ],
    };
  },
);

server.registerPrompt(
  'poem-writer',
  {
    title: 'Poem Writer',
    description: 'Write a nice haiku',
    argsSchema: { title: z.string(), mood: z.string().optional() },
  },
  ({ title, mood }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Write a haiku${mood ? ` with the mood ${mood}` : ''} called ${title}. Note that a haiku is 5 syllables followed by 7 syllables followed by 5 syllables `,
        },
      },
    ],
  }),
);

server.registerTool(
  'morning_icebreaker',
  {
    description: '朝会で使えるアイスブレイクネタを提案します',
    inputSchema: z.object({}).shape,
  },
  async () => {
    const selectedItem = icebreakers[Math.floor(Math.random() * icebreakers.length)];

    return {
      content: [
        {
          type: 'text',
          text: selectedItem,
        },
      ],
    };
  },
);

server.registerTool(
  'get_top_udm_agendas',
  {
    description: 'ウルトラ開発会議(UDM)プロジェクトから最も優先順度の高いアジェンダを3つ取得し、選定理由を論理的に説明します',
    inputSchema: z.object({}).shape,
  },
  async () => {
    // このツールはClaudeに対して、Atlassian MCPツールを使用して
    // UDMプロジェクトの課題を取得するよう指示を返します
    const jqlQuery = 'project = UDM AND status != Done AND status != 完了 ORDER BY priority DESC, created DESC';

    const instructions = `
Atlassian MCPツールを使用してUDMプロジェクトから優先度の高いアジェンダを取得してください。

【手順】
1. mcp__atlassian__getAccessibleAtlassianResourcesを使用してcloudIdを取得
2. mcp__atlassian__searchJiraIssuesUsingJqlを使用して以下のJQLクエリで課題を検索:
   JQL: ${jqlQuery}
   fields: ['key', 'summary', 'description', 'priority', 'status', 'created', 'issuetype', 'updated']
   maxResults: 100

3. 取得した全課題を以下の多角的な基準で総合的に評価・スコアリング:

   【評価基準】
   a) 優先度スコア（0-40点）
      - Highest: 40点
      - High: 30点
      - Medium: 20点
      - Low: 10点

   b) 説明の具体性・緊急性スコア（0-30点）
      - 説明フィールドの内容を分析し、以下を評価:
        * 具体的なアクション項目が明記されている: +10点
        * 期限や時間的制約が示されている: +10点
        * ビジネスインパクトが大きい: +10点
        * 説明が空または曖昧: 0点

   c) ステータススコア（0-15点）
      - To Do（未着手）: 15点（早急に対応が必要）
      - In Progress（進行中）: 10点（継続的な注意が必要）
      - その他: 5点

   d) 時間的緊急性スコア（0-15点）
      - 作成日または更新日が新しいほど高スコア
      - 1週間以内: 15点
      - 2週間以内: 10点
      - 1ヶ月以内: 5点
      - それ以上: 3点

4. 各課題の総合スコア（最大100点）を計算し、上位3つを選定

5. まず統計情報を表示:
   - 評価対象課題の合計数
   - 全課題の平均スコア
   - 最高スコア / 最低スコア
   - スコア分布（例: 80点以上: X件、60-79点: Y件、など）

6. 選定した3つのアジェンダについて、以下の情報を含めて報告:
   - 課題キー (例: UDM-66) ※必須
   - サマリー
   - 説明の要約（説明がない場合は「(説明なし)」と明記）
   - 優先度
   - ステータス
   - 総合スコア（100点満点中の点数）
   - 選定理由（各評価基準での得点とその理由を含めて論理的に説明）

**重要**: 単純に上から順番に選ぶのではなく、必ず上記のスコアリング基準に基づいて総合的に評価してください。

今すぐ上記の手順を実行してください。
`;

    return {
      content: [
        {
          type: 'text',
          text: instructions,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
