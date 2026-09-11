import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPublicBusinessLocation, sanitizePublicBusinessProfile } from '../src/lib/publicBusiness.js';

const business = {
  phone: '+2348012345678',
  whatsapp: '+2348098765432',
  email: 'seller@example.com',
  registration_number: 'PRIVATE-123',
  address: '12 Private Street',
  area: 'Farm Centre',
  city: 'Tarauni',
  state: 'Kano',
  country: 'Nigeria',
};

test('hides every contact field when public contact is disabled', () => {
  const safe = sanitizePublicBusinessProfile({ ...business, public_contact: false, contact_preference: 'both' });
  assert.equal(safe.phone, '');
  assert.equal(safe.whatsapp, '');
  assert.equal(safe.email, '');
  assert.equal(safe.registration_number, '');
});

test('respects the selected public contact method', () => {
  const whatsappOnly = sanitizePublicBusinessProfile({ ...business, public_contact: true, contact_preference: 'whatsapp' });
  assert.equal(whatsappOnly.phone, '');
  assert.equal(whatsappOnly.whatsapp, business.whatsapp);

  const callOnly = sanitizePublicBusinessProfile({ ...business, public_contact: true, contact_preference: 'call' });
  assert.equal(callOnly.phone, business.phone);
  assert.equal(callOnly.whatsapp, '');
});

test('limits public location detail to the seller setting', () => {
  assert.equal(formatPublicBusinessLocation({ ...business, location_visibility: 'city' }), 'Tarauni, Kano, Nigeria');
  assert.equal(formatPublicBusinessLocation({ ...business, location_visibility: 'approximate' }), 'Farm Centre, Tarauni, Kano, Nigeria');
  assert.equal(formatPublicBusinessLocation({ ...business, location_visibility: 'exact' }), '12 Private Street, Farm Centre, Tarauni, Kano, Nigeria');
});
