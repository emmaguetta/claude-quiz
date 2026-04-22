import React from 'react';
import { Composition } from 'remotion';
import { DemoVideo, FPS, DURATION_IN_FRAMES } from './DemoVideo';
import { DemoVideoEN, FPS as FPS_EN, DURATION_IN_FRAMES as DURATION_EN } from './DemoVideoEN';
import { DemoVideoStories, FPS as FPS_STORIES, DURATION_IN_FRAMES as DURATION_STORIES } from './DemoVideoStories';
import { DemoVideoStoriesEN, FPS as FPS_STORIES_EN, DURATION_IN_FRAMES as DURATION_STORIES_EN } from './DemoVideoStoriesEN';
import { DemoVideoMcpSearch, FPS as FPS_MCP, DURATION_IN_FRAMES as DURATION_MCP } from './DemoVideoMcpSearch';
import { DemoVideoMcpSearchEN, FPS as FPS_MCP_EN, DURATION_IN_FRAMES as DURATION_MCP_EN } from './DemoVideoMcpSearchEN';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ClaudeQuizDemo"
        component={DemoVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClaudeQuizDemoEN"
        component={DemoVideoEN}
        durationInFrames={DURATION_EN}
        fps={FPS_EN}
        width={1920}
        height={1080}
      />
      <Composition
        id="ClaudeQuizDemoStories"
        component={DemoVideoStories}
        durationInFrames={DURATION_STORIES}
        fps={FPS_STORIES}
        width={1080}
        height={1920}
      />
      <Composition
        id="ClaudeQuizDemoStoriesEN"
        component={DemoVideoStoriesEN}
        durationInFrames={DURATION_STORIES_EN}
        fps={FPS_STORIES_EN}
        width={1080}
        height={1920}
      />
      <Composition
        id="McpSearchDemo"
        component={DemoVideoMcpSearch}
        durationInFrames={DURATION_MCP}
        fps={FPS_MCP}
        width={1920}
        height={1080}
      />
      <Composition
        id="McpSearchDemoEN"
        component={DemoVideoMcpSearchEN}
        durationInFrames={DURATION_MCP_EN}
        fps={FPS_MCP_EN}
        width={1920}
        height={1080}
      />
    </>
  );
};
