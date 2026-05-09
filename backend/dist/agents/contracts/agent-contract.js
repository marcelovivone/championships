"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AGENT_WRITE_DISPOSITIONS = exports.AGENT_NOTIFICATION_STATUSES = exports.AGENT_NOTIFICATION_CHANNELS = exports.AGENT_APPROVAL_STATUSES = exports.AGENT_ACTION_STATUSES = exports.AGENT_ACTION_KINDS = exports.AGENT_RUN_STATUSES = exports.AGENT_TRIGGER_TYPES = exports.AGENT_EXECUTION_MODES = void 0;
exports.AGENT_EXECUTION_MODES = ['dry-run', 'manual', 'semi-automatic', 'autonomous'];
exports.AGENT_TRIGGER_TYPES = ['manual', 'schedule', 'event'];
exports.AGENT_RUN_STATUSES = [
    'queued',
    'running',
    'waiting-approval',
    'completed',
    'failed',
    'cancelled',
    'rejected',
];
exports.AGENT_ACTION_KINDS = ['read', 'notify', 'generate-script', 'write'];
exports.AGENT_ACTION_STATUSES = [
    'planned',
    'pending-approval',
    'approved',
    'executed',
    'blocked',
    'skipped',
    'failed',
    'rejected',
];
exports.AGENT_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
exports.AGENT_NOTIFICATION_CHANNELS = ['email', 'in-app'];
exports.AGENT_NOTIFICATION_STATUSES = ['pending', 'sent', 'failed', 'cancelled'];
exports.AGENT_WRITE_DISPOSITIONS = ['read-only', 'generate-script', 'approval-required', 'direct-write'];
//# sourceMappingURL=agent-contract.js.map