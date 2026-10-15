import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as services from './services/api';
import LandingPage from './pages/LandingPage';
import LoginSignupPage from './pages/LoginSignupPage';
import Dashboard from './pages/Dashboard';
import JournalMoodTracker from './pages/JournalMoodTracker';
import MoodInsights from './pages/MoodInsights';
import ChatbotPage from './pages/ChatbotPage';
import CommunitySupport from './pages/CommunitySupport';
import AppointmentBooking from './pages/AppointmentBooking';
import TherapistListing from './pages/TherapistListing';
import ResourcesPage from './pages/ResourcesPage';
import EmergencySupport from './pages/EmergencySupport';
import ProfileSettings from './pages/ProfileSettings';
import TherapistSignup from './pages/TherapistSignup';
import Assessment from './pages/Assessment';
import PersonalChat from './pages/PersonalChat';
import Button from './components/Button';
import { Card, CardContent, CardTitle, CardHeader, CardFooter, CardDescription } from './components/Card';
import Navbar from './components/Navbar';
import Modal from './components/Modal';
import Toast from './components/Toast';
import SpotlightCard from './components/SpotlightCard';
import UserAvatar from './components/UserAvatar';
import MoodBoard from './components/MoodBoard';
import MoodLineGraph from './components/MoodLineGraph';
import AppointmentCard from './components/AppointmentCard';

jest.mock('./services/api', () => {
  const fn = () => jest.fn().mockResolvedValue({ data: { success: true, entries: [], messages: [], therapists: [], appointments: [], userData: { name: 'Saved Name', email: 'saved@example.com', journalEntries: 0 }, hasSubmitted: true } });
  return {
    authService: { login: fn(), signup: fn(), registerTherapist: fn() },
    journalService: { getEntries: fn(), addEntry: fn(), deleteJournal: fn() },
    userService: { getUserStats: fn(), getUserProfile: fn(), updateUserProfile: fn(), storeAssessment: fn(), changePassword: fn(), deleteAccount: fn() },
    chatbotService: { getMessages: fn(), sendMessage: fn() },
    appointmentService: { getUserAppointments: fn(), getTherapistAppointments: fn(), getAvailableSlots: fn(), bookAppointment: fn(), cancelAppointment: fn(), rescheduleAppointment: fn(), saveRemarks: fn(), getMessages: fn(), sendMessage: fn() },
    therapistService: { getTherapists: fn(), getTherapistDetails: fn() },
    communityService: { getMessages: fn(), sendMessage: fn(), addReaction: fn() },
  };
});
const user = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user' };
const socket = { connected: true, on: jest.fn(), off: jest.fn(), emit: jest.fn(), connect: jest.fn() };
let host, root;
const toast = jest.fn();
async function render(Component, props = {}) {
  await act(async () => { root.render(<MemoryRouter initialEntries={props.validChat ? ["/chat/MQ=="] : ["/"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path={props.validChat ? "/chat/:id" : "*"} element={<Component user={user} showToast={toast} socket={socket} setUser={jest.fn()} {...props} />} /></Routes></MemoryRouter>); });
}
beforeEach(() => { jest.clearAllMocks(); Object.values(services).forEach(group => Object.values(group).forEach(fn => jest.isMockFunction(fn) && fn.mockResolvedValue({ data: { success: true, entries: [], messages: [], therapists: [], appointments: [], userData: { name: 'Saved Name', email: 'saved@example.com', journalEntries: 0 }, hasSubmitted: true } })));  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

test.each([LandingPage, LoginSignupPage, Dashboard, JournalMoodTracker, MoodInsights, ChatbotPage, CommunitySupport, AppointmentBooking, TherapistListing, ResourcesPage, EmergencySupport, ProfileSettings, TherapistSignup, Assessment, PersonalChat])('%p renders and disposes with API boundaries', async Component => {
  await render(Component);
  expect(host.textContent.length).toBeGreaterThan(0);
});
test.each([Button, Card, CardContent, CardTitle, CardHeader, CardFooter, CardDescription, Navbar, Modal, Toast, SpotlightCard, UserAvatar, MoodBoard, MoodLineGraph, AppointmentCard])('%p renders shared UI safely', async Component => {
  await render(Component, { children: 'Content', name: 'Test User', isOpen: true, onClose: jest.fn(), data: [], apt: { ID: 2, patientName: 'Patient', status: 'upcoming', unreadCount: 0 }, role: 'user', onCancel: jest.fn(), userId: 1, message: 'Notice' });
  expect(host.childNodes.length).toBeGreaterThan(0);
});
test('profile loads once and saves persisted values', async () => {
  await render(ProfileSettings);
  expect(services.userService.getUserProfile).toHaveBeenCalledTimes(1);
  expect(host.querySelector('input[name="name"]').value).toBe('Saved Name');
  const save = [...host.querySelectorAll('button')].find(button => button.textContent === 'Save Changes');
  await act(async () => Simulate.click(save));
  expect(services.userService.updateUserProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Saved Name' }));
  expect(toast).toHaveBeenCalledWith('Profile saved', 'success');
});
test('profile failure surfaces an actionable error', async () => {
  services.userService.updateUserProfile.mockRejectedValueOnce(new Error('offline'));
  await render(ProfileSettings);
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(button => button.textContent === 'Save Changes')));
  expect(toast).toHaveBeenCalledWith('Unable to save profile', 'error');
});
test('journal rejects blank entry without API mutation', async () => {
  await render(JournalMoodTracker);
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.journalService.addEntry).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith('Please write something first', 'warning');
});
test('assessment refuses incomplete responses', async () => {
  await render(Assessment);
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(host.querySelector('[role="alert"]').textContent).toContain('Please answer all questions');
  expect(services.userService.storeAssessment).not.toHaveBeenCalled();
});
test('resources open actual article content', async () => {
  await render(ResourcesPage);
  await act(async () => Simulate.click(host.querySelector('.read-more')));
  expect(host.querySelector('[aria-live="polite"]').textContent).toContain('Breathe gently');
});
test('appointment listeners are removed individually on unmount', async () => {
  await render(AppointmentCard, { apt: { ID: 2, status: 'upcoming' }, role: 'user', userId: 1 });
  const callback = socket.on.mock.calls[0][1];
  act(() => root.unmount());
  expect(socket.off).toHaveBeenCalledWith('new_message_notification', callback);
  root = createRoot(host);
});
test('mood graph plots low and high scores inside viewbox', async () => {
  await render(MoodLineGraph, { data: [{ score: 0, date: '2026-10-01' }, { score: 10, date: '2026-10-02' }] });
  expect(host.querySelector('svg')).toBeTruthy();
  expect(host.querySelector('polyline').getAttribute('points')).toBe('40,200 576,24');
});
test('invalid chat URL displays error without API request', async () => {
  await render(PersonalChat);
  expect(host.querySelector('[role="alert"]').textContent).toContain('Invalid appointment');
  expect(services.appointmentService.getMessages).not.toHaveBeenCalled();
});

test('journal persists entry and allows deletion', async () => {
  services.journalService.addEntry.mockResolvedValueOnce({ data: { entry: { ID: 8, content: 'Today was good', createdAt: '2026-10-14', score: 2 } } });
  await render(JournalMoodTracker);
  await act(async () => Simulate.change(host.querySelector('textarea'), { target: { value: 'Today was good' } }));
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(host.textContent).toContain('Today was good');
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent === 'Delete Entry')));
  expect(services.journalService.deleteJournal).toHaveBeenCalledWith(8);
  expect(host.textContent).not.toContain('Today was good');
});
test('journal failure restores draft and removes optimistic entry', async () => {
  services.journalService.addEntry.mockRejectedValueOnce(new Error('offline'));
  await render(JournalMoodTracker);
  await act(async () => Simulate.change(host.querySelector('textarea'), { target: { value: 'Keep my draft' } }));
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(host.querySelector('textarea').value).toBe('Keep my draft');
  expect(host.textContent).toContain('No entries yet');
});
test('assessment saves every selected answer', async () => {
  await render(Assessment);
  for (const radio of host.querySelectorAll('input[value="0"]')) await act(async () => Simulate.change(radio));
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.userService.storeAssessment).toHaveBeenCalledWith(expect.objectContaining({ stress: 0 }));
  expect(host.textContent).toContain('Assessment Complete');
});
test('chatbot network failure preserves prior history and restores input', async () => {
  services.chatbotService.getMessages.mockResolvedValueOnce({ data: { messages: [{ sender: 'bot', text: 'Existing message', chatID: 1 }] } });
  services.chatbotService.sendMessage.mockRejectedValueOnce(new Error('offline'));
  await render(ChatbotPage);
  await act(async () => Simulate.change(host.querySelector('.chat-input'), { target: { value: 'New message' } }));
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(host.textContent).toContain('Existing message');
  expect(host.querySelector('.chat-input').value).toBe('New message');
});

test('appointment reschedule loads availability and persists new slot', async () => {
  const today = new Date();
  const year = today.getFullYear(); const month = today.getMonth();
  const target = new Date(year, month, 28);
  if (target <= today) target.setMonth(month + 1);
  const date = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-28`;
  const therapist = { userID: 7, ID: 7, Name: 'Doctor', Email: 'doctor@example.com', availableDays: 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday', startTime: '09:00', endTime: '17:00' };
  services.appointmentService.getUserAppointments.mockResolvedValueOnce({ data: { appointments: [{ ID: 9, therapistID: 7, therapistName: 'Doctor', status: 'upcoming', date, time: '09:00' }] } });
  services.therapistService.getTherapistDetails.mockResolvedValueOnce({ data: { therapist } });
  services.appointmentService.getAvailableSlots.mockResolvedValueOnce({ data: { slots: [{ time: '15:00', booked: false }] } });
  await render(AppointmentBooking);
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent === 'Reschedule')));
  if (target.getMonth() !== month) await act(async () => Simulate.click(host.querySelectorAll('.cal-nav')[1]));
  await act(async () => Simulate.click(host.querySelector(`[title="${date}"]`)));
  await act(async () => Simulate.click(host.querySelector('.time-slot')));
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent === 'Confirm Reschedule')));
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent === 'Confirm & Reschedule')));
  expect(services.appointmentService.rescheduleAppointment).toHaveBeenCalledWith(9, { date, time: '15:00' });
  expect(services.appointmentService.bookAppointment).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith('Appointment rescheduled successfully!', 'success');
});

async function change(selector, value) {
  await act(async () => Simulate.change(host.querySelector(selector), { target: { name: host.querySelector(selector).name, value } }));
}
test('login submits credentials and stores authenticated session', async () => {
  const setAuth = jest.fn(); const setUser = jest.fn();
  services.authService.login.mockResolvedValueOnce({ data: { success: true, token: 'login-jwt', user } });
  await render(LoginSignupPage, { setIsAuthenticated: setAuth, setUser });
  await change('input[name="email"]', 'test@example.com'); await change('input[name="password"]', 'password123');
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
  expect(localStorage.getItem('token')).toBe('login-jwt'); expect(setAuth).toHaveBeenCalledWith(true);
});
test('therapist registration rejects missing required details', async () => {
  await render(TherapistSignup); await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.authService.registerTherapist).not.toHaveBeenCalled(); expect(host.textContent).toContain('required');
});
test('therapist specialty filtering requests selected category', async () => {
  await render(TherapistListing);
  await act(async () => Simulate.click([...host.querySelectorAll('.filter-btn')].find(b => b.textContent === 'Depression')));
  expect(services.therapistService.getTherapists).toHaveBeenLastCalledWith('', 'Depression', '', '');
});
test('community sends content and refreshes persisted messages', async () => {
  await render(CommunitySupport); await change('.chat-text-input','Hello community');
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.communityService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello community', isAnonymous: true }));
  expect(services.communityService.getMessages).toHaveBeenCalledTimes(2);
});
test('community reaction uses persisted message identifier', async () => {
  services.communityService.getMessages.mockResolvedValueOnce({ data: { messages: [{ ID: 5, content: 'Hello', reactions: { heart: 1 }, createdAt: '2026-10-14' }] } });
  await render(CommunitySupport); await act(async () => Simulate.click(host.querySelector('.reaction-pill')));
  expect(services.communityService.addReaction).toHaveBeenCalledWith(5,'heart');
});
test('profile password change sends current and new password', async () => {
  await render(ProfileSettings);
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent === 'Change Password')));
  const passwords = host.querySelectorAll('input[type="password"]');
  await act(async () => Simulate.change(passwords[0], { target: { value: 'oldpassword' } }));
  await act(async () => Simulate.change(passwords[1], { target: { value: 'newpassword' } }));
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.userService.changePassword).toHaveBeenCalledWith({ currentPassword: 'oldpassword', newPassword: 'newpassword' });
});
test('profile deletion requires password form and logs out', async () => {
  const logout = jest.fn(); await render(ProfileSettings, { onLogout: logout });
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent === 'Delete Account')));
  expect(services.userService.deleteAccount).not.toHaveBeenCalled(); await change('input[type="password"]','mypassword');
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.userService.deleteAccount).toHaveBeenCalledWith('mypassword'); expect(logout).toHaveBeenCalled();
});
test('appointment cancellation invokes API and removes card', async () => {
  services.appointmentService.getUserAppointments.mockResolvedValueOnce({ data: { appointments: [{ ID: 4, status: 'upcoming', therapistName: 'Doctor' }] } });
  await render(AppointmentBooking);
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent === 'Cancel')));
  expect(services.appointmentService.cancelAppointment).toHaveBeenCalledWith(4); expect(host.textContent).toContain('No appointments yet');
});

test('signup submits validated user registration', async () => {
  const setAuth = jest.fn(); services.authService.signup.mockResolvedValueOnce({ data: { token: 'signup-jwt', user } });
  await render(LoginSignupPage, { setIsAuthenticated: setAuth });
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Sign up')));
  await change('input[name="name"]','Test User'); await change('input[name="email"]','test@example.com');
  await change('input[name="password"]','password123'); await change('input[name="confirmPassword"]','password123');
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.authService.signup).toHaveBeenCalledWith('test@example.com','password123','Test User'); expect(setAuth).toHaveBeenCalledWith(true);
});
test('private chat sends to decoded appointment and isolates socket messages', async () => {
  await render(PersonalChat, { validChat: true });
  expect(services.appointmentService.getMessages).toHaveBeenCalledWith('1');
  await change('.chat-text-input','Hello doctor'); await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.appointmentService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ content:'Hello doctor' }),'1');
  const callback = socket.on.mock.calls.find(([event]) => event === 'receive_message')[1];
  await act(async () => callback({ aptId: '2', sentBy: 7, content: 'Wrong room' }));
  expect(host.textContent).not.toContain('Wrong room');
  await act(async () => callback({ aptId: '1', sentBy: 7, content: 'Right room', createdAt:'2026-10-14' }));
  expect(host.textContent).toContain('Right room');
});

test('chatbot carries conversation ID across successful responses', async () => {
  services.chatbotService.sendMessage.mockResolvedValue({ data: { success:true, chatId:17, botReply:{sender:'bot',text:'Reply'} } });
  await render(ChatbotPage);
  await change('.chat-input','First'); await act(async () => Simulate.submit(host.querySelector('form')));
  await change('.chat-input','Second'); await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.chatbotService.sendMessage).toHaveBeenLastCalledWith(expect.objectContaining({chatID:17,text:'Second'}));
});
test('mood insights display persisted score range and calendar statistics', async () => {
  services.userService.getUserStats.mockResolvedValueOnce({data:{entries:[{score:1,mood:'Sad',emoji:'S',createdAt:'2026-10-12'},{score:10,mood:'Happy',emoji:'H',createdAt:'2026-10-13'}]}});
  await render(MoodInsights);
  expect(host.textContent).toContain('5.5'); expect(host.textContent).toContain('10/10');
  expect(host.querySelector('polyline').getAttribute('points')).toBe('40,182.4 576,24');
});
test('therapist remarks persist through session modal', async () => {
  await render(AppointmentCard,{apt:{ID:3,status:'completed',patientName:'Patient'},role:'therapist'});
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b=>b.textContent.includes('Add Remarks'))));
  await change('textarea','Follow up next week');
  await act(async () => Simulate.click([...host.querySelectorAll('button')].find(b=>b.textContent==='Save Remarks')));
  expect(services.appointmentService.saveRemarks).toHaveBeenCalledWith({id:3,remarks:'Follow up next week'});
  expect(host.textContent).toContain('Edit Remarks');
});

test('therapist registration validates hours and preserves authenticated user ID', async () => {
  const setAuth = jest.fn(); const setUser = jest.fn();
  services.authService.registerTherapist.mockResolvedValueOnce({data:{token:'therapist-jwt',user:{...user,id:7,role:'therapist'}}});
  await render(TherapistSignup,{setIsAuthenticated:setAuth,setUser});
  const fields={fullName:'Doctor Smith',email:'doctor@example.com',password:'password123',confirmPassword:'password123',phone:'9876543210',specialization:'Depression',yearsOfExperience:'5',bio:'A sufficiently long professional biography for registration.',city:'Mumbai',address:'Clinic Street',consultationFee:'1000',mode:'online',startTime:'09:00',endTime:'08:00'};
  for (const [name,value] of Object.entries(fields)) await change(`[name="${name}"]`,value);
  await act(async () => Simulate.click(host.querySelector('.day-chip')));
  await act(async () => Simulate.submit(host.querySelector('form')));
  expect(host.textContent).toContain('End time must be after start time');
  expect(services.authService.registerTherapist).not.toHaveBeenCalled();
  await change('[name="endTime"]','17:00'); await act(async () => Simulate.submit(host.querySelector('form')));
  expect(services.authService.registerTherapist).toHaveBeenCalledWith(expect.objectContaining({name:'Doctor Smith',availableDays:['Monday'],consultationFee:1000}));
  expect(setUser).toHaveBeenCalledWith(expect.objectContaining({id:7,role:'therapist'}));
});

test('appointment booking persists selected therapist, date and slot', async () => {
  const today=new Date(); const target=new Date(today.getFullYear(),today.getMonth(),28); if(target<=today) target.setMonth(target.getMonth()+1);
  const date=`${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-28`;
  const therapist={id:2,userID:7,Name:'Doctor',Email:'doctor@example.com',availableDays:'Sunday Monday Tuesday Wednesday Thursday Friday Saturday',startTime:'09:00',endTime:'17:00',mode:'online'};
  services.therapistService.getTherapists.mockResolvedValueOnce({data:{therapists:[therapist]}});
  services.appointmentService.getAvailableSlots.mockResolvedValueOnce({data:{slots:[{time:'15:00',booked:false}]}});
  await render(AppointmentBooking); await act(async()=>Simulate.click(host.querySelector('.therapist-card')));
  if(target.getMonth()!==today.getMonth()) await act(async()=>Simulate.click(host.querySelectorAll('.cal-nav')[1]));
  await act(async()=>Simulate.click(host.querySelector(`[title="${date}"]`)));
  await act(async()=>Simulate.click(host.querySelector('.time-slot')));
  await act(async()=>Simulate.click([...host.querySelectorAll('button')].find(b=>b.textContent==='Confirm Booking')));
  await act(async()=>Simulate.click([...host.querySelectorAll('button')].find(b=>b.textContent==='Confirm & Book')));
  expect(services.appointmentService.bookAppointment).toHaveBeenCalledWith({therapistId:7,date,time:'15:00'});
  expect(services.appointmentService.rescheduleAppointment).not.toHaveBeenCalled();
});

test('assessment displays returned informal reflection score and feedback', async () => {
  services.userService.storeAssessment.mockResolvedValueOnce({data:{success:true,score:75,feedback:'Consider a small step toward rest and connection.'}});
  await render(Assessment);
  for(const radio of host.querySelectorAll('input[value="0"]')) await act(async()=>Simulate.change(radio));
  await act(async()=>Simulate.submit(host.querySelector('form')));
  expect(host.textContent).toContain('Wellness reflection: 75/100');
  expect(host.textContent).toContain('Consider a small step toward rest and connection.');
  expect(host.textContent).toContain('not a diagnosis');
});
