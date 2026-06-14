import { useLoadTestStore } from '../../stores/useLoadTestStore';
import LoadTestingBuilder from './LoadTestingBuilder';
import LoadTestingDashboard from './LoadTestingDashboard';

export default function LoadTestingView() {
  const { currentStage, selectedReportRunId } = useLoadTestStore();

  const isIdle = currentStage === 'IDLE' && !selectedReportRunId;

  if (isIdle) {
    return <LoadTestingBuilder />;
  }

  return <LoadTestingDashboard />;
}
