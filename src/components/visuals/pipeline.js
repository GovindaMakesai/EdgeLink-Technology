'use client';

import { stageState, VISUAL_STAGES } from '@/lib/steps';
import { elapsedLabel } from '@/lib/utils';

export function PipelineRail({ status, currentStep, startedAt, completedAt }) {
  const elapsed = elapsedLabel(startedAt, status === 'COMPLETED' || status === 'FAILED' ? completedAt : null);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="label">Audit pipeline</span>
        {elapsed ? <span className="label">{elapsed}</span> : null}
      </div>
      <div className="pipeline">
        {VISUAL_STAGES.map((stage, index) => {
          const state = stageState(stage, currentStep, status);
          return (
            <div className={`pipe-step ${state}`} key={stage.id}>
              <div className="pipe-rail">
                <span className="pipe-dot" />
                {index < VISUAL_STAGES.length - 1 ? <span className="pipe-line" /> : null}
              </div>
              <div className="pipe-copy">
                <strong>{stage.label}</strong>
                <span>{state === 'active' ? 'In progress' : state === 'done' ? 'Complete' : state === 'failed' ? 'Stopped here' : stage.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
