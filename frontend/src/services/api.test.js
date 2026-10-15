jest.mock('axios', () => ({ create: jest.fn() }));
const axios = require('axios');
let client, services, request, reject;
beforeEach(() => {
  jest.resetModules(); localStorage.clear();
  client = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), interceptors: { request: { use: jest.fn(fn => { request = fn; }) }, response: { use: jest.fn((ok, fn) => { reject = fn; }) } } };
  require('axios').create.mockReturnValue(client);
  services = require('./api');
});
test('request interceptor adds stored JWT without requiring token', () => {
  expect(request({ headers: {} }).headers).toEqual({});
  localStorage.setItem('token', 'jwt');
  expect(request({ headers: {} }).headers.Authorization).toBe('Bearer jwt');
});
test('login failures retain rejection without redirecting existing session', async () => {
  const error = { response: { status: 401 }, config: { url: '/auth/login' } };
  localStorage.setItem('token', 'jwt');
  await expect(reject(error)).rejects.toBe(error);
  expect(localStorage.getItem('token')).toBe('jwt');
});
test.each([
  ['authService','login',['e','p'],'post','/auth/login'], ['authService','signup',['e','p','n'],'post','/auth/signup'],
  ['authService','logout',[],'post','/auth/logout'], ['authService','me',[],'get','/auth/me'], ['authService','registerTherapist',[{}],'post','/auth/therapist-signup'],
  ['journalService','addEntry',[1,'text','date'],'post','journal/addEntry'], ['journalService','getEntries',[],'get','/journal/entries'], ['journalService','deleteJournal',[1],'delete','/journal/1'],
  ['appointmentService','getAvailableSlots',[1,'date'],'get','/appointments/slots'], ['appointmentService','bookAppointment',[{}],'post','/appointments/book'],
  ['appointmentService','getUserAppointments',[],'get','/appointments/user'], ['appointmentService','getTherapistAppointments',[],'get','/appointments/therapist'],
  ['appointmentService','saveRemarks',[{id:1,remarks:'r'}],'put','/appointments/remark'], ['appointmentService','sendMessage',[{},1],'post','/appointments/chat/message'],
  ['appointmentService','getMessages',[1],'get','/appointments/chat/messages'], ['appointmentService','cancelAppointment',[1],'delete','/appointments/1'],
  ['appointmentService','rescheduleAppointment',[1,{date:'2026-10-15',time:'10:00'}],'put','/appointments/1/reschedule'],
  ['therapistService','getTherapists',['','All','All',100],'get','/therapist/all'], ['therapistService','getTherapistDetails',[1],'get','/therapist/1'],
  ['communityService','sendMessage',[{}],'post','/community/message'], ['communityService','getMessages',[],'get','/community/messages'],
  ['communityService','addReaction',[1,'heart'],'post','/community/posts/1/react'], ['communityService','getPosts',[],'get','/community/posts'],
  ['communityService','createPost',['text',true],'post','/community/posts'], ['communityService','deletePost',[1],'delete','/community/posts/1'],
  ['moodService','getMoodHistory',[],'get','/mood/history'], ['moodService','analyzeMood',['text'],'post','/mood/analyze'],
  ['userService','getUserStats',[],'get','/user/stats'], ['userService','storeAssessment',[{}],'post','/user/assessment'],
  ['userService','getUserProfile',[],'get','/user/profile'], ['userService','updateUserProfile',[{}],'put','/user/profile'],
  ['userService','changePassword',[{}],'put','/user/password'], ['userService','deleteAccount',['p'],'delete','/user/account'],
  ['chatbotService','getMessages',[],'get','/chatbot/messages'], ['chatbotService','sendMessage',[{}],'post','/chatbot/message']
])('%s.%s uses expected HTTP contract', (service, method, args, verb, path) => {
  services[service][method](...args);
  expect(client[verb].mock.calls[0][0]).toBe(path);
});
test('booking and sensitive mutations carry correct payload', () => {
  services.appointmentService.getAvailableSlots(7, '2026-10-15');
  expect(client.get).toHaveBeenCalledWith('/appointments/slots', { params: { therapistId: 7, date: '2026-10-15' } });
  services.userService.deleteAccount('password');
  expect(client.delete).toHaveBeenCalledWith('/user/account', { data: { password: 'password' } });
});
