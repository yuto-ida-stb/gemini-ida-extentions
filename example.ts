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
    try {
      // UDMプロジェクトの課題を優先度順に取得
      // 説明、ステータス、優先度、作成日などのフィールドを含める
      // ステータスが「完了」「Done」のものは除外
      const jqlQuery = 'project = UDM AND status != Done AND status != 完了 ORDER BY priority DESC, created DESC';

      // Note: 実際の実装では以下のようにAtlassian MCP Serverを呼び出す必要があります
      // const result = await callAtlassianMCP('searchJiraIssuesUsingJql', {
      //   cloudId: 'stanby-inc',
      //   jql: jqlQuery,
      //   fields: ['key', 'summary', 'description', 'priority', 'status', 'created', 'issuetype'],
      //   maxResults: 10
      // });
      //
      // 取得した課題から上位3つを選定し、以下の形式で返す:
      // {
      //   top_agendas: [
      //     {
      //       key: 'UDM-66',
      //       summary: '課題のサマリー',
      //       description: '課題の説明',
      //       priority: 'Highest',
      //       status: 'To Do',
      //       reason: '選定理由: 優先度が最高で、説明から緊急性が高いことが分かる...'
      //     },
      //     ...
      //   ]
      // }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              instruction: 'このツールを完全に動作させるには、Atlassian MCPサーバーとの統合が必要です。',
              implementation_guide: {
                jql_query: jqlQuery,
                required_fields: ['key', 'summary', 'description', 'priority', 'status', 'created', 'issuetype'],
                note: '課題キー(例: UDM-66)は必須フィールドとして取得します',
                logic: [
                  '1. ステータスが「完了」「Done」の課題を除外（JQLクエリで除外済み）',
                  '2. 課題キー(key)、サマリー、説明、優先度などを取得',
                  '3. 優先度(priority)が高い順に課題をソート',
                  '4. 説明フィールド(description)の内容を分析',
                  '5. 以下の基準で総合評価:',
                  '   - 優先度の高さ',
                  '   - 説明の具体性と緊急性',
                  '   - ステータス（未着手や進行中を優先、完了は除外）',
                  '   - 作成日（最近のものを優先）',
                  '6. 上位3つを選定し、課題キーと共に選定理由を説明',
                ],
                output_format: {
                  top_agendas: [
                    {
                      key: 'UDM-XX (必須)',
                      summary: '課題のサマリー',
                      description: '課題の説明',
                      priority: '優先度',
                      status: 'ステータス',
                      reason: '選定理由の論理的説明',
                    },
                  ],
                },
              },
              next_steps: [
                '1. Atlassian MCP Serverの認証設定を完了',
                '2. cloudIdの取得（stanby-inc.atlassian.netの場合）',
                '3. mcp__atlassian__searchJiraIssuesUsingJqlツールを使用した実装',
              ],
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `エラーが発生しました: ${error}`,
          },
        ],
        isError: true,
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
