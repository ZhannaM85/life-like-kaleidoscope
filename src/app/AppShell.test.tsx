import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from './AppShell'

function renderShell() {
  const router = createMemoryRouter([
    { path: '/', element: <AppShell />, children: [{ index: true, element: <p>Today content</p> }] },
  ])
  return render(<RouterProvider router={router} />)
}

describe('AppShell', () => {
  it('renders the app title and the outlet content', () => {
    renderShell()
    expect(screen.getByText('Life Like Kaleidoscope')).toBeInTheDocument()
    expect(screen.getByText('Today content')).toBeInTheDocument()
  })

  it('renders every route in both the desktop nav and the mobile tab bar', () => {
    renderShell()
    for (const label of ['Today', 'Memories', 'Search', 'Graph', 'Export', 'Settings']) {
      // one link per nav variant; media queries decide which is shown
      expect(screen.getAllByRole('link', { name: label })).toHaveLength(2)
    }
  })
})
