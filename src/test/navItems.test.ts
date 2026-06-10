import { getNavGroups } from 'src/Components/Navbar/menu/navItems'

describe('getNavGroups', () => {
  it('logged out: only the Browse group (Home, Recipes)', () => {
    const groups = getNavGroups(false)
    expect(groups.map(g => g.heading)).toEqual(['Browse'])
    expect(groups[0].items.map(i => i.label)).toEqual(['Home', 'Recipes'])
  })

  it('logged in: Browse + Create + Account groups', () => {
    const groups = getNavGroups(true)
    expect(groups.map(g => g.heading)).toEqual(['Browse', 'Create', 'Account'])
    expect(groups[1].items.map(i => i.label)).toEqual(['Create Recipe'])
    expect(groups[2].items.map(i => i.label)).toEqual(['Account', 'Help'])
  })

  it('every item has a route and an icon', () => {
    for (const group of getNavGroups(true)) {
      for (const item of group.items) {
        expect(item.to).toMatch(/^\//)
        expect(item.icon).toBeTruthy()
      }
    }
  })
})
