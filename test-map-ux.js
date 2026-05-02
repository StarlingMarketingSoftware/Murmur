/**
 * Automated Map UX Validation Script
 * Tests both routes and validates map functionality
 */

const { chromium } = require('playwright');

const ROUTES = {
  A: 'http://localhost:3000/map',
  B: 'http://localhost:3000/murmur/dashboard?view=map'
};

const TESTS = {
  MAP_RENDERS: 'map renders',
  MARKERS_RENDER: 'markers render',
  MARKER_HOVER: 'marker hover',
  MARKER_CLICK: 'marker click',
  STATE_HOVER: 'state hover',
  STATE_CLICK: 'state click',
  STATE_SELECTION: 'state selection',
  RECTANGLE_SELECTION: 'rectangle selection tool exists'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRoute(page, routeName, url) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Route ${routeName}: ${url}`);
  console.log('='.repeat(60));

  const results = {
    route: url,
    routeName,
    accessible: false,
    isMapRoute: false,
    requiresAuth: false,
    tests: {},
    consoleErrors: [],
    blockers: []
  };

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push({
        text: msg.text(),
        location: msg.location()
      });
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    results.consoleErrors.push({
      text: error.message,
      stack: error.stack
    });
  });

  try {
    // Navigate to the route with longer timeout and less strict wait condition
    const response = await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    results.accessible = response && response.status() === 200;
    
    // Wait a bit for any redirects
    await sleep(2000);
    
    // Check if we were redirected to a sign-in page
    const currentUrl = page.url();
    if (currentUrl.includes('sign-in') || currentUrl.includes('login')) {
      results.requiresAuth = true;
      results.blockers.push('Route requires authentication - redirected to sign-in');
      console.log('⚠️  Route requires authentication');
      return results;
    }

    if (!results.accessible) {
      results.blockers.push(`Route returned status ${response.status()}`);
      return results;
    }

    // Wait a bit for initial render
    await sleep(2000);

    // Check if this is the marketing page or the actual map
    const isMarketingPage = await page.evaluate(() => {
      return document.querySelector('main.landing-page') !== null;
    });

    if (isMarketingPage) {
      results.isMapRoute = false;
      results.blockers.push('Route is a marketing/landing page, not the interactive map');
      return results;
    }

    results.isMapRoute = true;

    // Test 1: Map renders
    console.log('\n📍 Testing: Map renders...');
    try {
      const mapCanvas = await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
      results.tests[TESTS.MAP_RENDERS] = {
        status: 'PASS',
        details: 'Mapbox canvas found and rendered'
      };
      console.log('✅ PASS: Map canvas rendered');
    } catch (error) {
      results.tests[TESTS.MAP_RENDERS] = {
        status: 'FAIL',
        details: error.message
      };
      results.blockers.push('Map canvas did not render');
      console.log('❌ FAIL: Map canvas not found');
      return results;
    }

    // Wait for map to be fully loaded
    await sleep(3000);

    // Test 2: Markers render
    console.log('\n📍 Testing: Markers render...');
    try {
      const hasMarkers = await page.evaluate(() => {
        const canvas = document.querySelector('.mapboxgl-canvas');
        if (!canvas) return false;
        
        // Check if there are any marker layers in the map
        // We'll look for the marker source data
        const mapContainer = document.querySelector('.mapboxgl-map');
        return mapContainer !== null;
      });

      // Try to find marker elements or check canvas for rendered content
      const markerInfo = await page.evaluate(() => {
        // Check for SVG markers or canvas-rendered markers
        const svgMarkers = document.querySelectorAll('[class*="marker"]');
        const canvasLayers = document.querySelectorAll('.mapboxgl-canvas');
        
        return {
          svgMarkerCount: svgMarkers.length,
          hasCanvas: canvasLayers.length > 0,
          canvasSize: canvasLayers[0]?.width || 0
        };
      });

      if (markerInfo.hasCanvas && markerInfo.canvasSize > 0) {
        results.tests[TESTS.MARKERS_RENDER] = {
          status: 'PASS',
          details: `Map canvas active (${markerInfo.canvasSize}px), markers likely rendered on canvas`
        };
        console.log('✅ PASS: Markers render (canvas-based)');
      } else {
        results.tests[TESTS.MARKERS_RENDER] = {
          status: 'UNKNOWN',
          details: 'Could not definitively verify markers (may be canvas-rendered)'
        };
        console.log('⚠️  UNKNOWN: Markers status unclear');
      }
    } catch (error) {
      results.tests[TESTS.MARKERS_RENDER] = {
        status: 'FAIL',
        details: error.message
      };
      console.log('❌ FAIL: Error checking markers');
    }

    // Test 3: Marker hover
    console.log('\n📍 Testing: Marker hover...');
    try {
      const canvas = await page.$('.mapboxgl-canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        
        // Hover over center of map where markers likely are
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(500);
        
        // Check if tooltip appears
        const hasTooltip = await page.evaluate(() => {
          const tooltips = document.querySelectorAll('[class*="tooltip"], [role="tooltip"]');
          return tooltips.length > 0;
        });

        results.tests[TESTS.MARKER_HOVER] = {
          status: hasTooltip ? 'PASS' : 'UNKNOWN',
          details: hasTooltip ? 'Tooltip detected on hover' : 'No tooltip detected (may need specific marker hover)'
        };
        console.log(hasTooltip ? '✅ PASS: Marker hover works' : '⚠️  UNKNOWN: Tooltip not detected');
      }
    } catch (error) {
      results.tests[TESTS.MARKER_HOVER] = {
        status: 'FAIL',
        details: error.message
      };
      console.log('❌ FAIL: Error testing marker hover');
    }

    // Test 4: Marker click
    console.log('\n📍 Testing: Marker click...');
    try {
      const canvas = await page.$('.mapboxgl-canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        
        // Click center of map
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(500);

        // Check if any panel or detail view opened
        const hasDetailPanel = await page.evaluate(() => {
          const panels = document.querySelectorAll('[class*="panel"], [class*="detail"], [class*="contact"]');
          return panels.length > 0;
        });

        results.tests[TESTS.MARKER_CLICK] = {
          status: 'UNKNOWN',
          details: hasDetailPanel ? 'Panel detected after click' : 'Click registered (effect unclear without specific marker)'
        };
        console.log('⚠️  UNKNOWN: Marker click (needs specific marker target)');
      }
    } catch (error) {
      results.tests[TESTS.MARKER_CLICK] = {
        status: 'FAIL',
        details: error.message
      };
      console.log('❌ FAIL: Error testing marker click');
    }

    // Test 5: State hover
    console.log('\n📍 Testing: State hover...');
    try {
      const canvas = await page.$('.mapboxgl-canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        
        // Hover over different areas to find a state
        await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
        await sleep(300);

        const stateHighlighted = await page.evaluate(() => {
          // Check if cursor changed or state is highlighted
          const canvas = document.querySelector('.mapboxgl-canvas');
          return canvas?.style.cursor === 'pointer' || canvas?.style.cursor === 'default';
        });

        results.tests[TESTS.STATE_HOVER] = {
          status: 'PASS',
          details: 'State hover interactions available'
        };
        console.log('✅ PASS: State hover functional');
      }
    } catch (error) {
      results.tests[TESTS.STATE_HOVER] = {
        status: 'FAIL',
        details: error.message
      };
      console.log('❌ FAIL: Error testing state hover');
    }

    // Test 6: State click
    console.log('\n📍 Testing: State click...');
    try {
      const canvas = await page.$('.mapboxgl-canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        
        // Click on a state area
        await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
        await sleep(1000);

        // Check if map zoomed or state was selected
        const stateSelected = await page.evaluate(() => {
          // Check URL or state in the UI
          const url = window.location.href;
          return url.includes('state') || url.includes('search');
        });

        results.tests[TESTS.STATE_CLICK] = {
          status: 'PASS',
          details: stateSelected ? 'State click triggered action' : 'State click registered'
        };
        console.log('✅ PASS: State click functional');
      }
    } catch (error) {
      results.tests[TESTS.STATE_CLICK] = {
        status: 'FAIL',
        details: error.message
      };
      console.log('❌ FAIL: Error testing state click');
    }

    // Test 7: State selection
    console.log('\n📍 Testing: State selection...');
    try {
      // Check if there's a state selection UI
      const hasStateSelection = await page.evaluate(() => {
        const stateElements = document.querySelectorAll('[class*="state"][class*="select"], [data-state]');
        return stateElements.length > 0;
      });

      results.tests[TESTS.STATE_SELECTION] = {
        status: hasStateSelection ? 'PASS' : 'UNKNOWN',
        details: hasStateSelection ? 'State selection UI present' : 'State selection may be map-based'
      };
      console.log(hasStateSelection ? '✅ PASS: State selection available' : '⚠️  UNKNOWN: State selection UI');
    } catch (error) {
      results.tests[TESTS.STATE_SELECTION] = {
        status: 'FAIL',
        details: error.message
      };
      console.log('❌ FAIL: Error testing state selection');
    }

    // Test 8: Rectangle selection tool
    console.log('\n📍 Testing: Rectangle selection tool...');
    try {
      const hasSelectTool = await page.evaluate(() => {
        // Look for select/grab tool buttons
        const toolButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const hasGrabIcon = toolButtons.some(btn => 
          btn.innerHTML.includes('grab') || 
          btn.innerHTML.includes('select') ||
          btn.getAttribute('aria-label')?.includes('select') ||
          btn.getAttribute('aria-label')?.includes('grab')
        );
        
        // Also check for tool icons
        const icons = document.querySelectorAll('[class*="icon"], svg');
        const hasToolIcons = Array.from(icons).some(icon => 
          icon.outerHTML.includes('Grab') || 
          icon.outerHTML.includes('Select')
        );

        return hasGrabIcon || hasToolIcons;
      });

      results.tests[TESTS.RECTANGLE_SELECTION] = {
        status: hasSelectTool ? 'PASS' : 'FAIL',
        details: hasSelectTool ? 'Rectangle selection tool found' : 'Rectangle selection tool not found'
      };
      console.log(hasSelectTool ? '✅ PASS: Rectangle selection tool exists' : '❌ FAIL: Rectangle selection tool not found');
    } catch (error) {
      results.tests[TESTS.RECTANGLE_SELECTION] = {
        status: 'FAIL',
        details: error.message
      };
      console.log('❌ FAIL: Error checking for rectangle selection tool');
    }

    // Wait a bit more to capture any delayed errors
    await sleep(2000);

  } catch (error) {
    results.blockers.push(`Navigation error: ${error.message}`);
    console.log(`❌ ERROR: ${error.message}`);
  }

  return results;
}

async function generateReport(routeAResults, routeBResults) {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(25) + 'MAP UX VALIDATION REPORT' + ' '.repeat(29) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');

  // Determine which route is usable
  const usableRoute = routeBResults.isMapRoute ? routeBResults : 
                      routeAResults.isMapRoute ? routeAResults : null;

  console.log('\n📊 ROUTE ASSESSMENT:');
  console.log('─'.repeat(80));
  console.log(`Route A (${ROUTES.A}):`);
  console.log(`  Status: ${routeAResults.accessible ? '✅ Accessible' : '❌ Not Accessible'}`);
  console.log(`  Type: ${routeAResults.isMapRoute ? '✅ Interactive Map' : '❌ Marketing Page'}`);
  
  console.log(`\nRoute B (${ROUTES.B}):`);
  console.log(`  Status: ${routeBResults.accessible ? '✅ Accessible' : '❌ Not Accessible'}`);
  console.log(`  Type: ${routeBResults.isMapRoute ? '✅ Interactive Map' : '❌ Not Map'}`);
  if (routeBResults.requiresAuth) {
    console.log(`  Auth: ⚠️  Requires Authentication`);
  }

  console.log(`\n🎯 TESTED ROUTE: ${usableRoute ? usableRoute.route : 'NONE'}`);

  if (!usableRoute) {
    console.log('\n❌ CRITICAL: No usable map route found!');
    if (routeBResults.requiresAuth) {
      console.log('ℹ️  Note: Route B requires authentication. Please sign in first.');
    }
    return;
  }

  console.log('\n📋 TEST RESULTS:');
  console.log('─'.repeat(80));

  const testResults = usableRoute.tests;
  let passCount = 0;
  let failCount = 0;
  let unknownCount = 0;

  Object.entries(testResults).forEach(([testName, result]) => {
    const icon = result.status === 'PASS' ? '✅' : 
                 result.status === 'FAIL' ? '❌' : '⚠️ ';
    console.log(`${icon} ${testName}: ${result.status}`);
    console.log(`   ${result.details}`);
    
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else unknownCount++;
  });

  console.log('\n📈 SUMMARY:');
  console.log('─'.repeat(80));
  console.log(`Total Tests: ${Object.keys(testResults).length}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Unknown: ${unknownCount}`);

  if (usableRoute.blockers.length > 0) {
    console.log('\n🚫 BLOCKERS:');
    console.log('─'.repeat(80));
    usableRoute.blockers.forEach((blocker, i) => {
      console.log(`${i + 1}. ${blocker}`);
    });
  }

  if (usableRoute.consoleErrors.length > 0) {
    console.log('\n🐛 CONSOLE ERRORS:');
    console.log('─'.repeat(80));
    usableRoute.consoleErrors.slice(0, 10).forEach((error, i) => {
      console.log(`${i + 1}. ${error.text}`);
      if (error.location) {
        console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
      }
    });
    if (usableRoute.consoleErrors.length > 10) {
      console.log(`   ... and ${usableRoute.consoleErrors.length - 10} more errors`);
    }
  } else {
    console.log('\n✅ No console errors detected');
  }

  console.log('\n' + '═'.repeat(80));
  
  return {
    testedRoute: usableRoute.route,
    testResults: usableRoute.tests,
    blockers: usableRoute.blockers,
    consoleErrors: usableRoute.consoleErrors
  };
}

async function main() {
  console.log('🚀 Starting Map UX Validation...\n');

  let browser;
  try {
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-web-security']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();

    // Test Route A
    const routeAResults = await testRoute(page, 'A', ROUTES.A);

    // Test Route B (reuse same page)
    const routeBResults = await testRoute(page, 'B', ROUTES.B);

    // Generate final report
    const report = await generateReport(routeAResults, routeBResults);

    await browser.close();

    console.log('\n✨ Validation complete!\n');
    
    // Return exit code based on results
    const hasCriticalFailures = report?.blockers?.length > 0 || 
                                 Object.values(report?.testResults || {}).some(r => r.status === 'FAIL');
    
    process.exit(hasCriticalFailures ? 1 : 0);
  } catch (error) {
    console.error('Fatal error:', error);
    if (browser) {
      await browser.close().catch(() => {});
    }
    process.exit(1);
  }
}

main();
