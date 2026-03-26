import './index.css';
import {Composition} from 'remotion';
import {
  LEAGUE_BUILDER_FLOW_DURATION,
  LeagueBuilderLaunchFlow,
} from './demo/LeagueBuilderLaunchFlow';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LeagueBuilderVertical"
        component={LeagueBuilderLaunchFlow}
        durationInFrames={LEAGUE_BUILDER_FLOW_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LeagueBuilderWide"
        component={LeagueBuilderLaunchFlow}
        durationInFrames={LEAGUE_BUILDER_FLOW_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LeagueBuilderSquare"
        component={LeagueBuilderLaunchFlow}
        durationInFrames={LEAGUE_BUILDER_FLOW_DURATION}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
