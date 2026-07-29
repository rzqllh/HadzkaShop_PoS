## Error Type

Runtime PrismaClientKnownRequestError

## Error Message

Invalid `__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["prisma"].user.findUnique()` invocation in
C:\Users\Hafizh Rizqullah\Documents\Code\PoS\.next\dev\server\chunks\ssr\[root-of-the-server]\__1o5rnj7._.js:47:159

44 const supabase = await (0, **TURBOPACK**imported**module**$5b$project$5d2f$src$2f$lib$2f$server$2e$ts**$5b$app$2d$rsc$5d$**$28$ecmascript$29$**["createClient"])();
45 const { data: { user } } = await supabase.auth.getUser();
46 if (!user || !user.email) return null;
→ 47 const appUser = await **TURBOPACK**imported**module**$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts**$5b$app$2d$rsc$5d$**$28$ecmascript$29$**["prisma"].user.findUnique(
Database error. Code: `XX000`. Message: `(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`

    at <unknown> (src\auth.ts:10:37)
    at  auth (src\auth.ts:10:19)
    at  POSPage (src\app\pos\page.tsx:7:19)
    at resolveErrorDev (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-server-dom-turbopack_0nu427q._.js:1919:105)
    at processFullStringRow (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-server-dom-turbopack_0nu427q._.js:2434:29)
    at processFullBinaryRow (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-server-dom-turbopack_0nu427q._.js:2393:9)
    at processBinaryChunk (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-server-dom-turbopack_0nu427q._.js:2502:221)
    at progress (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-server-dom-turbopack_0nu427q._.js:2689:13)

## Code Frame

8 | if (!user || !user.email) return null;
9 |

> 10 | const appUser = await prisma.user.findUnique({ where: { email: user.email } });

     |                                     ^

11 | if (!appUser) return null;
12 |
13 | return {

Next.js version: 16.2.11 (Turbopack)

## Error Type

Console Error

## Error Message

Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client. Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).

    at createConsoleError (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_1d1z6dc._.js:2391:71)
    at handleConsoleError (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_1d1z6dc._.js:3177:54)
    at console.error (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_1d1z6dc._.js:3324:57)
    at completeWork (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:6945:102)
    at runWithFiberInDEV (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:965:74)
    at completeUnitOfWork (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:9622:23)
    at performUnitOfWork (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:9557:28)
    at workLoopSync (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:9449:40)
    at renderRootSync (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:9433:13)
    at performWorkOnRoot (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:9061:186)
    at performWorkOnRootViaSchedulerTask (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_react-dom_08l76y7._.js:10255:9)
    at MessagePort.performWorkUntilDeadline (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/06p1_next_dist_compiled_0e6njf3._.js:2647:64)
    at script (<anonymous>:null:null)
    at <unknown> (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/node_modules__pnpm_1q81d_s._.js:4292:297)
    at V (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/node_modules__pnpm_1q81d_s._.js:4269:293)
    at J (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/node_modules__pnpm_1q81d_s._.js:4170:1174)
    at ThemeProvider (file://C:/Users/Hafizh Rizqullah/Documents/Code/PoS/.next/dev/static/chunks/src_1pw98vp._.js:361:325)
    at RootLayout (src\app\layout.tsx:31:9)

## Code Frame

29 | >
30 | <body className="min-h-full flex flex-col">

> 31 | <ThemeProvider

     |         ^

32 | attribute="class"
33 | defaultTheme="system"
34 | enableSystem

Next.js version: 16.2.11 (Turbopack)
