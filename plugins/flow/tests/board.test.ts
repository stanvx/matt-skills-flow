import { expect, test } from 'claude-code/testing'

import { boardDoc } from '../hooks/board'
import { approvePhase, createTask, recordArtifact, recordSkill } from '../hooks/flow'

test('the board document carries the flow, status and PR choice', () => {
  const task = createTask('Retry checkout', 1, { flow: 'spec', openPr: false })
  const doc = boardDoc(task, 'shop', 9)

  expect(doc).toMatchObject({ flow: 'spec', status: 'ready', openPr: false })
  expect(doc).not.toHaveProperty('model')
  expect(doc).not.toHaveProperty('effort')
})

test('the board document says when a person is waited on, and when the task is done', () => {
  const writing = recordSkill(createTask('Retry checkout', 1, { flow: 'spec' }), 'to-spec', 2)
  const specced = recordArtifact(writing, '.scratch/retry-checkout/spec.md', 3)

  expect(boardDoc(writing, 'shop', 9).status).toBe('ready')
  expect(boardDoc(specced, 'shop', 9).status).toBe('waiting')
  expect(boardDoc(approvePhase(specced, 4), 'shop', 9).status).toBe('ready')
  expect(boardDoc({ ...specced, closedAt: 8 }, 'shop', 9).status).toBe('done')
})

test('the board document carries the model and effort when they are set', () => {
  const task = createTask('Retry checkout', 1, { model: 'opus', effort: 'high' })

  expect(boardDoc(task, 'shop', 9)).toMatchObject({ model: 'opus', effort: 'high', openPr: true })
})
