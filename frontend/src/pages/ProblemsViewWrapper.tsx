/**
 * Problems View Wrapper for Routing
 *
 * Wraps the existing ProblemsView component for use with react-router
 */
import { useParams } from 'react-router-dom';
import { ProblemsView } from './ProblemsView';

export function ProblemsViewWrapper() {
  const { documentId } = useParams<{ documentId: string }>();

  if (!documentId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-grey-600">문서 ID가 필요합니다</p>
      </div>
    );
  }

  return <ProblemsView documentId={documentId} />;
}
