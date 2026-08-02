import { resolvePlayerPhotoUrl } from '../player-photo';

describe('resolvePlayerPhotoUrl', () => {
  it('uses avatar_url when present', () => {
    expect(resolvePlayerPhotoUrl({
      avatar_url: 'https://example.test/avatar.png',
      photo_url: 'https://example.test/photo.png',
    })).toBe('https://example.test/avatar.png');
  });

  it('falls back to photo_url when avatar_url is missing', () => {
    expect(resolvePlayerPhotoUrl({
      avatar_url: null,
      photo_url: 'https://example.test/registration-photo.png',
    })).toBe('https://example.test/registration-photo.png');
  });

  it('treats blank strings as missing', () => {
    expect(resolvePlayerPhotoUrl({
      avatar_url: '   ',
      photo_url: ' https://example.test/photo.png ',
    })).toBe('https://example.test/photo.png');
  });

  it('returns null when neither picture field has a value', () => {
    expect(resolvePlayerPhotoUrl({ avatar_url: null, photo_url: null })).toBeNull();
    expect(resolvePlayerPhotoUrl(null)).toBeNull();
  });
});
