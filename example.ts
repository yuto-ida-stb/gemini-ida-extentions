/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

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
    const icebreakers = [
      '朝食はパン派？ごはん派？',
      '好きな季節とその理由は？',
      '最近ハマっているものは何ですか？',
      'もし一つだけ超能力が使えるなら何を選びますか？',
      '無人島に3つだけ持っていけるとしたら？',
      '今までで一番おいしかった食べ物は？',
      '座右の銘や好きな言葉は？',
      '休日の理想の過ごし方は？',
      '今までで一番笑った出来事は？',
      '行ってみたい国や場所は？',
      'もし宝くじが当たったら何をしますか？',
      '最近感動したことは？',
      '子供の頃の夢は何でしたか？',
      '好きな映画やドラマのジャンルは？',
      '今一番欲しいものは？',
      '得意料理や好きな食べ物は？',
      'ストレス解消法は？',
      '最近買ってよかったものは？',
      'もしタイムマシンがあったら過去と未来どっちに行く？',
      '人生で一番影響を受けた人は？',
      '今までで一番頑張ったことは？',
      '理想の休日は？',
      '最近始めたことや挑戦していることは？',
      '自分の長所を一つ教えてください',
      '好きな音楽のジャンルやアーティストは？',
    ];

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

const transport = new StdioServerTransport();
await server.connect(transport);
