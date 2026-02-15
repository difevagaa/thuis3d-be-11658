import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SmartStatusDialog } from './SmartStatusDialog';
import { useStatusTransitionRules } from '@/hooks/useStatusTransitionRules';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SmartStatusSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string; color?: string }>;
  entityType: 'order' | 'quote' | 'invoice' | 'product' | 'gift_card' | 'coupon';
  entityId: string;
  tableName: string;
  statusType: 'order_status' | 'payment_status' | 'quote_status' | 'invoice_status';
  currentValue: string;
  entityName?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Smart Status Select Component
 * Automatically handles status transition rules and shows confirmation dialogs
 * when changing statuses that have associated rules
 */
export const SmartStatusSelect: React.FC<SmartStatusSelectProps> = ({
  label,
  value,
  onChange,
  options,
  entityType,
  entityId,
  tableName,
  statusType,
  currentValue,
  entityName,
  disabled = false,
  className,
  placeholder = 'Seleccionar...'
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState<string>('');
  const [pendingRule, setPendingRule] = useState<any>(null);
  const { checkTransition, applyRuleAction, trackRuleInteraction } = useStatusTransitionRules();

  const handleValueChange = async (newValue: string) => {
    // If same value, no need to check
    if (newValue === currentValue) {
      onChange(newValue);
      return;
    }

    // Check if there are transition rules for this change
    const transitionCheck = await checkTransition(
      entityType,
      entityId,
      tableName,
      currentValue,
      newValue,
      statusType
    );

    if (transitionCheck.shouldPrompt && transitionCheck.rules.length > 0) {
      // Store the pending change and show dialog
      setPendingValue(newValue);
      setPendingRule(transitionCheck.rules[0]);
      setShowDialog(true);
    } else {
      // No rules, just apply the change
      onChange(newValue);
    }
  };

  const handleDialogOptionSelected = async (option: string, reason?: string) => {
    if (!pendingRule) return;

    const selectedOption = pendingRule.options.find((opt: any) => opt.value === option);
    if (!selectedOption) {
      setShowDialog(false);
      setPendingRule(null);
      setPendingValue('');
      return;
    }

    // Track that user completed the action
    await trackRuleInteraction(pendingRule.id, 'completed');

    // Apply the suggested action
    if (selectedOption.action && selectedOption.action !== 'none') {
      const success = await applyRuleAction(
        entityId,
        tableName,
        selectedOption.action,
        pendingRule.suggests_status_type,
        pendingRule.suggests_status_value,
        pendingRule.id
      );

      if (success) {
        // Apply the original status change
        onChange(pendingValue);
      }
    } else {
      // Just apply the original change without additional actions
      onChange(pendingValue);
    }

    // Close dialog and reset state
    setShowDialog(false);
    setPendingRule(null);
    setPendingValue('');
  };

  const handleDialogClose = () => {
    // User cancelled - track as dismissed
    if (pendingRule) {
      trackRuleInteraction(pendingRule.id, 'dismissed');
    }
    setShowDialog(false);
    setPendingRule(null);
    setPendingValue('');
  };

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {label && <Label>{label}</Label>}
        <Select
          value={value}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex items-center gap-2">
                  {option.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span>{option.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pendingRule && (
        <SmartStatusDialog
          open={showDialog}
          onOpenChange={(open) => {
            if (!open) handleDialogClose();
          }}
          rule={pendingRule}
          onOptionSelected={handleDialogOptionSelected}
          entityName={entityName}
        />
      )}
    </>
  );
};
