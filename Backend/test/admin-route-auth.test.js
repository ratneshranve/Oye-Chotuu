import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const landingRoutes = read('../src/modules/food/landing/routes/landing.routes.js');
const dudhwalaConfigRoutes = read('../src/modules/dudhwala/routes/config.routes.js');

test('food landing admin routes require admin authentication', () => {
  assert.match(landingRoutes, /const adminOnly = \[authMiddleware, requireRoles\('ADMIN', 'SUB_ADMIN'\)\]/);

  const guardedRoutes = [
    "router.get('/hero-banners', ...adminOnly, listHeroBannersController)",
    "router.delete('/hero-banners/:id', ...adminOnly, deleteHeroBannerController)",
    "router.patch('/hero-banners/:id/order', ...adminOnly, updateHeroBannerOrderController)",
    "router.patch('/hero-banners/:id/status', ...adminOnly, toggleHeroBannerStatusController)",
    "router.patch('/hero-banners/:id', ...adminOnly, updateHeroBannerController)",
    "router.get('/hero-banners/under-250', ...adminOnly, listUnder250BannersController)",
    "router.get('/hero-banners/dining', ...adminOnly, listDiningBannersController)",
    "router.get('/hero-banners/landing/explore-more', ...adminOnly, listExploreMoreController)",
    "router.get('/hero-banners/gourmet', ...adminOnly, listGourmetAdmin)",
    "router.post('/hero-banners/gourmet', ...adminOnly, createGourmetAdmin)",
    "router.get('/hero-banners/landing/settings', ...adminOnly, getAdminLandingSettingsController)",
    "router.patch('/hero-banners/landing/settings', ...adminOnly, updateAdminLandingSettingsController)",
    "router.post('/hero-banners/landing/settings/header-video', ...adminOnly, upload.single('video'), uploadAdminLandingHeaderVideoController)",
    "router.delete('/hero-banners/landing/settings/header-video', ...adminOnly, deleteAdminLandingHeaderVideoController)",
  ];

  for (const route of guardedRoutes) {
    assert.ok(landingRoutes.includes(route), `${route} should be guarded`);
  }
});

test('food landing public routes remain public', () => {
  const publicRoutes = [
    "router.get('/pages/:key', getPublicPageController)",
    "router.get('/referral-settings', getPublicReferralSettingsController)",
    "router.get('/hero-banners/public', getPublicHeroBannersController)",
    "router.get('/hero-banners/under-250/public', getPublicUnder250BannersController)",
    "router.get('/hero-banners/dining/public', getPublicDiningBannersController)",
    "router.get('/explore-icons/public', getPublicExploreIconsController)",
    "router.get('/hero-banners/gourmet/public', getPublicGourmetController)",
    "router.get('/landing/settings/public', getPublicLandingSettingsController)",
    "router.get('/zones/detect', detectZonePublicController)",
    "router.get('/zones/nearby', listZonesNearbyPublicController)",
    "router.get('/zones/public', listZonesPublicController)",
    "router.get('/public/env', getPublicEnvController)",
  ];

  for (const route of publicRoutes) {
    assert.ok(landingRoutes.includes(route), `${route} should remain public`);
    assert.ok(!landingRoutes.includes(route.replace('Controller)', 'Controller, ...adminOnly)')));
  }
});

test('dudhwala config admin routes are protected and public routes remain public', () => {
  assert.match(dudhwalaConfigRoutes, /const adminOnly = \[authMiddleware, requireRoles\('ADMIN', 'SUB_ADMIN'\)\]/);

  for (const route of [
    "router.post('/', ...adminOnly, MilkConfigController.addConfig)",
    "router.get('/', ...adminOnly, MilkConfigController.getConfigs)",
    "router.put('/:id', ...adminOnly, MilkConfigController.updateConfig)",
    "router.delete('/:id', ...adminOnly, MilkConfigController.removeConfig)",
  ]) {
    assert.ok(dudhwalaConfigRoutes.includes(route), `${route} should be guarded`);
  }

  for (const route of [
    "router.get('/public/bootstrap', MilkConfigController.getBootstrap)",
    "router.get('/public/:type', MilkConfigController.getPublicConfigs)",
  ]) {
    assert.ok(dudhwalaConfigRoutes.includes(route), `${route} should remain public`);
  }
});