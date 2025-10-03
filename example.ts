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
   fields: ['key', 'summary', 'description', 'priority', 'status', 'created', 'issuetype']
   maxResults: 10

3. 取得した課題から上位3つを以下の基準で選定:
   - 優先度(priority)の高さ
   - 説明(description)の具体性と緊急性
   - ステータス（未着手や進行中を優先、完了は除外済み）
   - 作成日（最近のものを優先）

4. 選定した3つのアジェンダについて、以下の情報を含めて報告:
   - 課題キー (例: UDM-66) ※必須
   - サマリー
   - 説明の要約
   - 優先度
   - ステータス
   - 選定理由（論理的に説明）

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
