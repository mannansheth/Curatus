import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import App from './App';
import api from './services/api';
import { QUESTIONS, OPTIONS, SPECIALIZATIONS } from './data/data';
jest.mock('./services/api', () => ({ __esModule: true, default: { get: jest.fn() }, userService: { getUserStats: jest.fn() }, appointmentService: { getTherapistAppointments: jest.fn() } }));
jest.mock('socket.io-client', () => { const socket = { connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() }; return { io: jest.fn(() => socket), socket }; });
jest.mock('./pages/Dashboard', () => ({ showToast }) => <div>Authenticated Dashboard<input aria-label="Persistent draft" defaultValue="" /><button onClick={() => showToast('Status update')}>Trigger toast</button></div>);
let host, root;
beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/dashboard'); host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });
test('protected route redirects signed-out user to login', async () => {
  await act(async () => root.render(<App />));
  expect(window.location.pathname).toBe('/login');
  expect(api.get).not.toHaveBeenCalled();
});
test('saved JWT restores user, connects socket and logout disconnects', async () => {
  localStorage.setItem('token', 'jwt');
  api.get.mockResolvedValueOnce({ data: { id: 1, role: 'user', name: 'Tester' } });
  await act(async () => root.render(<App />));
  expect(host.textContent).toContain('Authenticated Dashboard');
  const socket = require('socket.io-client').socket;
  expect(socket.connect).toHaveBeenCalled();
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('logout'))));
  expect(localStorage.getItem('token')).toBeNull();
  expect(socket.disconnect).toHaveBeenCalled();
});
test('invalid stored JWT is cleared and user redirected', async () => {
  localStorage.setItem('token','bad'); api.get.mockRejectedValueOnce(new Error('unauthorized'));
  await act(async () => root.render(<App />));
  expect(localStorage.getItem('token')).toBeNull();
  expect(window.location.pathname).toBe('/login');
});
test('assessment data has unique keys and continuous score options', () => {
  expect(new Set(QUESTIONS.map(q => q.key)).size).toBe(8);
  expect(OPTIONS.map(option => option.value)).toEqual([0,1,2,3,4]);
  expect(SPECIALIZATIONS[0]).toBe('All');
});

test('toast updates preserve protected page mount and draft', async () => {
  localStorage.setItem('token','jwt'); api.get.mockResolvedValueOnce({data:{id:1,role:'user',name:'Tester'}});
  await act(async () => root.render(<App />));
  const draft=host.querySelector('[aria-label="Persistent draft"]'); draft.value='Keep this draft';
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(button=>button.textContent==='Trigger toast')));
  expect(host.querySelector('[aria-label="Persistent draft"]')).toBe(draft);
  expect(draft.value).toBe('Keep this draft'); expect(host.textContent).toContain('Status update');
  await act(async () => Simulate.click(host.querySelector('.toast-close')));
  expect(host.querySelector('[aria-label="Persistent draft"]')).toBe(draft);
  expect(draft.value).toBe('Keep this draft'); expect(host.textContent).not.toContain('Status update');
});
