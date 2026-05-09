import { Test } from '@nestjs/testing';
import { AgentAdminService } from '../../src/agents/agent-admin.service';
import { AgentsController } from '../../src/agents/agents.controller';
import { AgentEventTriggerService } from '../../src/agents/agent-event-trigger.service';
import { AgentScheduleService } from '../../src/agents/agent-schedule.service';
import { AgentRunExecutionReport } from '../../src/agents/contracts';
import { TriggerDispatcher } from '../../src/agents/trigger-dispatcher.service';

describe('AgentsController trigger channels', () => {
  const baseReport: AgentRunExecutionReport = {
    runId: 41,
    runKey: 'dummy-agent-test-run',
    agentDefinitionId: 7,
    agentConfigId: 9,
    status: 'completed',
    summary: 'Dummy agent executed',
    actions: [],
    definition: {
      agentKey: 'dummy-agent',
      name: 'Dummy Agent',
      defaultMode: 'dry-run',
      supportsManualTrigger: true,
      supportsSchedule: true,
      supportsEventTrigger: true,
    },
    context: {
      agentKey: 'dummy-agent',
      mode: 'dry-run',
      triggerType: 'manual',
      triggerSource: 'test-source',
      startedAt: new Date('2026-04-30T12:00:00.000Z'),
    },
  };

  const agentAdminServiceMock = {
    listAgentSetups: jest.fn().mockResolvedValue({
      items: [
        {
          definition: baseReport.definition,
          schedules: [{ jobName: 'agent-schedule:dummy-agent:9' }],
        },
      ],
    }),
  };

  const triggerDispatcherMock = {
    dispatchManual: jest.fn().mockResolvedValue({
      ...baseReport,
      context: { ...baseReport.context, triggerType: 'manual' },
    }),
  };

  const scheduleServiceMock = {
    listSchedules: jest.fn().mockResolvedValue([
      {
        jobName: 'agent-schedule:dummy-agent:9',
        agentKey: 'dummy-agent',
        agentName: 'Dummy Agent',
        scheduleExpression: '*/5 * * * *',
        nextScheduledAt: new Date('2026-04-30T12:05:00.000Z'),
        agentConfigId: 9,
      },
    ]),
    dispatchScheduledAgent: jest.fn().mockResolvedValue({
      ...baseReport,
      context: { ...baseReport.context, triggerType: 'schedule', triggerSource: 'cron:test' },
    }),
    reloadSchedules: jest.fn().mockResolvedValue({ registeredJobs: 1, invalidSchedules: [], jobNames: ['agent-schedule:dummy-agent:9'] }),
  };

  const eventTriggerServiceMock = {
    dispatch: jest.fn().mockResolvedValue({
      ...baseReport,
      context: { ...baseReport.context, triggerType: 'event', triggerSource: 'match:completed' },
    }),
  };

  let controller: AgentsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        { provide: AgentAdminService, useValue: agentAdminServiceMock },
        { provide: TriggerDispatcher, useValue: triggerDispatcherMock },
        { provide: AgentScheduleService, useValue: scheduleServiceMock },
        { provide: AgentEventTriggerService, useValue: eventTriggerServiceMock },
      ],
    }).compile();

    controller = moduleRef.get(AgentsController);
  });

  it('returns standardized reports for manual, scheduled, and event triggers', async () => {
    const manual = await controller.triggerManual('dummy-agent', {
      mode: 'dry-run',
      initiatedBy: 'tester',
      correlationId: 'corr-manual',
      requestId: 'req-manual',
      triggerSource: 'admin-manual',
      payload: { source: 'manual' },
      metadata: { origin: 'spec' },
    });

    const scheduled = await controller.triggerScheduled('dummy-agent', {
      mode: 'dry-run',
      initiatedBy: 'tester',
      correlationId: 'corr-schedule',
      requestId: 'req-schedule',
      triggerSource: 'cron:test',
      payload: { source: 'schedule' },
      metadata: { origin: 'spec' },
    });

    const event = await controller.triggerEvent('dummy-agent', {
      mode: 'dry-run',
      initiatedBy: 'tester',
      correlationId: 'corr-event',
      requestId: 'req-event',
      triggerSource: 'match:completed',
      payload: { source: 'event' },
      metadata: { origin: 'spec' },
    });

    expect(manual).toMatchObject({ runId: 41, status: 'completed', context: { triggerType: 'manual' } });
    expect(scheduled).toMatchObject({ runId: 41, status: 'completed', context: { triggerType: 'schedule' } });
    expect(event).toMatchObject({ runId: 41, status: 'completed', context: { triggerType: 'event' } });
  });

  it('lists registered agents together with grouped schedule data', async () => {
    const response = await controller.listAgents();

    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      definition: { agentKey: 'dummy-agent' },
      schedules: [{ jobName: 'agent-schedule:dummy-agent:9' }],
    });
  });
});