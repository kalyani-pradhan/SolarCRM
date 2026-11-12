import { describe, expect, it } from 'vitest'

import { getDefaultTelecallerName, sanitizeTeamMembers } from './LogCallModal'

describe('LogCallModal defaults', () => {
  it('does not auto-select any telecaller from the team list', () => {
    expect(getDefaultTelecallerName(['Alice', 'Bob'], null)).toBe('')
  })

  it('removes placeholder values from the team member list', () => {
    expect(sanitizeTeamMembers(['Conditions', 'Alice', 'Alice', '  Bob  '])).toEqual(['Alice', 'Bob'])
  })
})
