import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createSession, verifyToken, SessionUser } from '../src/lib/auth/session';

describe('Authentication & Session Security Tests', () => {
  it('should hash passwords with salt rounds and verify correctly', async () => {
    const password = 'AuthorPass@2026';
    const hash = await bcrypt.hash(password, 10);

    assert.notEqual(hash, password);
    assert.equal(await bcrypt.compare(password, hash), true);
    assert.equal(await bcrypt.compare('WrongPassword', hash), false);
  });

  it('should sign and verify valid JWT session token', async () => {
    const user: SessionUser = {
      id: 'user_123',
      email: 'vikram.seth@example.com',
      name: 'Vikram Seth',
      role: 'AUTHOR',
      authorProfileId: 'profile_456',
    };

    // Verify token structure
    const token = await createSession(user);
    assert.ok(token);
    assert.equal(typeof token, 'string');

    const decoded = await verifyToken(token);
    assert.ok(decoded);
    assert.equal(decoded?.id, user.id);
    assert.equal(decoded?.email, user.email);
    assert.equal(decoded?.role, 'AUTHOR');
    assert.equal(decoded?.authorProfileId, 'profile_456');
  });

  it('should reject tampered or invalid JWT session tokens', async () => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature';
    const decoded = await verifyToken(fakeToken);
    assert.equal(decoded, null);
  });

  it('should enforce distinct roles between AUTHOR and ADMIN', async () => {
    const authorUser: SessionUser = {
      id: 'auth_1',
      email: 'author@example.com',
      name: 'Author User',
      role: 'AUTHOR',
    };
    const adminUser: SessionUser = {
      id: 'admin_1',
      email: 'admin@bookleafpublishing.com',
      name: 'Ops Admin',
      role: 'ADMIN',
    };

    const authorToken = await createSession(authorUser);
    const adminToken = await createSession(adminUser);

    const verifiedAuthor = await verifyToken(authorToken);
    const verifiedAdmin = await verifyToken(adminToken);

    assert.equal(verifiedAuthor?.role, 'AUTHOR');
    assert.equal(verifiedAdmin?.role, 'ADMIN');
    assert.notEqual(verifiedAuthor?.role, verifiedAdmin?.role);
  });
});
