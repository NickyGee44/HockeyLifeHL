/**
 * Custom ESLint rules for Supabase test quality
 * - no-unscoped-service-test: flag tests using Supabase client without asserting scoping
 * - require-error-code-assertion: flag ok===false checks without error code assertions
 * - no-mock-echo: flag tests asserting mock return value equals result
 */

const supabasePatterns = [
  'createClient', 'createServiceClient', 'supabaseAdmin',
  'getServiceClient', 'getSupabaseClient', 'createServerClient',
  'supabase', 'serviceClient', 'adminClient'
];

const scopingFields = ['org_id', 'user_id', 'tenant_id', 'tenant', 'organization_id', 'team_id', 'league_id'];

const noUnscopedServiceTest = {
  meta: {
    type: 'problem',
    docs: { description: 'Require scoping assertions in tests that use Supabase clients' },
    messages: {
      missing: 'Test creates a Supabase client but never asserts org_id, user_id, or tenant scoping. Add at least one scoping assertion.',
    },
  },
  create(context) {
    let hasSupabaseClient = false;
    let hasScopingAssertion = false;

    return {
      CallExpression(node) {
        const name = node.callee.name || (node.callee.property && node.callee.property.name);
        if (name && supabasePatterns.includes(name)) {
          hasSupabaseClient = true;
        }
      },
      MemberExpression(node) {
        if (node.property && scopingFields.includes(node.property.name || node.property.value)) {
          const ancestors = context.getAncestors ? context.getAncestors() : context.sourceCode.getAncestors(node);
          if (ancestors.some(a => a.type === 'CallExpression' && a.callee && (a.callee.name === 'expect' || (a.callee.object && a.callee.object.name === 'expect')))) {
            hasScopingAssertion = true;
          }
        }
      },
      Literal(node) {
        if (typeof node.value === 'string' && scopingFields.includes(node.value)) {
          const ancestors = context.getAncestors ? context.getAncestors() : context.sourceCode.getAncestors(node);
          if (ancestors.some(a => a.type === 'CallExpression' && a.callee && (a.callee.name === 'expect' || a.callee.name === 'toHaveProperty' || (a.callee.property && a.callee.property.name === 'toHaveProperty')))) {
            hasScopingAssertion = true;
          }
        }
      },
      'Program:exit'(node) {
        if (hasSupabaseClient && !hasScopingAssertion) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
};

const requireErrorCodeAssertion = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Require specific error code/message assertion when checking ok === false' },
    messages: {
      missing: 'Test checks ok === false but does not assert the specific error code or message. Add expect(result.error.code) or expect(result.error.message).',
    },
  },
  create(context) {
    const okFalseNodes = [];
    let hasErrorCodeAssertion = false;

    return {
      BinaryExpression(node) {
        // Detect ok === false or ok == false patterns
        const isOkFalse = (
          (node.left.type === 'MemberExpression' && node.left.property && node.left.property.name === 'ok' &&
           node.right.type === 'Literal' && node.right.value === false) ||
          (node.right.type === 'MemberExpression' && node.right.property && node.right.property.name === 'ok' &&
           node.left.type === 'Literal' && node.left.value === false)
        );
        if (isOkFalse) {
          okFalseNodes.push(node);
        }
      },
      CallExpression(node) {
        // Detect toBeFalsy/toBe(false) on .ok
        if (node.callee.property && ['toBe', 'toBeFalsy', 'toEqual', 'toStrictEqual'].includes(node.callee.property.name)) {
          const src = context.sourceCode.getText(node);
          if (src.includes('.ok') && (src.includes('false') || node.callee.property.name === 'toBeFalsy')) {
            okFalseNodes.push(node);
          }
        }
      },
      MemberExpression(node) {
        // Detect .error.code, .error.message, .error.status access inside expect
        if (node.property && ['code', 'message', 'status', 'statusCode'].includes(node.property.name || node.property.value)) {
          if (node.object && node.object.property && node.object.property.name === 'error') {
            hasErrorCodeAssertion = true;
          }
        }
      },
      'Program:exit'() {
        if (okFalseNodes.length > 0 && !hasErrorCodeAssertion) {
          for (const node of okFalseNodes) {
            context.report({ node, messageId: 'missing' });
          }
        }
      },
    };
  },
};

const noMockEcho = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Flag tests that assert result equals the exact mock return value' },
    messages: {
      echo: 'Test asserts result equals the exact value returned by the mock. This tests the mock, not the code.',
    },
  },
  create(context) {
    const mockValues = new Map(); // var name -> source text of return value

    return {
      CallExpression(node) {
        const callee = node.callee;
        // Detect mockReturnValue, mockResolvedValue, mockResolvedValueOnce, mockImplementation
        if (callee.property && ['mockReturnValue', 'mockResolvedValue', 'mockReturnValueOnce', 'mockResolvedValueOnce'].includes(callee.property.name)) {
          if (node.arguments.length > 0) {
            const arg = node.arguments[0];
            const src = context.sourceCode.getText(arg);
            // Track by the object being mocked
            const objSrc = context.sourceCode.getText(callee.object);
            mockValues.set(src, { node: arg, mock: objSrc });
          }
        }

        // Detect expect(x).toEqual(y) / toBe(y) / toStrictEqual(y)
        if (callee.property && ['toEqual', 'toBe', 'toStrictEqual'].includes(callee.property.name) && node.arguments.length > 0) {
          const assertedSrc = context.sourceCode.getText(node.arguments[0]);
          if (mockValues.has(assertedSrc)) {
            context.report({ node, messageId: 'echo' });
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: 'eslint-plugin-supabase-test-quality', version: '1.0.0' },
  rules: {
    'no-unscoped-service-test': noUnscopedServiceTest,
    'require-error-code-assertion': requireErrorCodeAssertion,
    'no-mock-echo': noMockEcho,
  },
};

export default plugin;
