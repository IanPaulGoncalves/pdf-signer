import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;
        
        return (
          <React.Fragment key={index}>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onStepClick?.(index)}
            >
              <div
                className={cn(
                  'step-indicator',
                  isComplete && 'step-indicator-complete',
                  isCurrent && 'step-indicator-active',
                  isPending && 'step-indicator-pending',
                )}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:block',
                  isCurrent && 'text-foreground',
                  !isCurrent && 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 sm:w-16 h-0.5 rounded-full',
                  index < currentStep ? 'bg-success' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
