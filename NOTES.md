# NOTES: Feature Flag Editor

บันทึกการตัดสินใจทางเทคนิคของโจทย์ Feature Flag Editor

## วิธีรัน

```bash
corepack pnpm@10 install
corepack pnpm@10 dev     # http://localhost:3000/code-challenge/feature-flag-form
corepack pnpm@10 test    # 6 ไฟล์, 72 tests
corepack pnpm@10 build
```

> ทำไมต้องระบุ `pnpm@10`: `pnpm-lock.yaml` สร้างด้วย pnpm 9/10
>
> - pnpm 12 ไม่อ่าน `pnpm.onlyBuiltDependencies` ใน package.json แล้ว
> - pnpm 12 จะ resolve dependency ที่ระบุเป็น `latest` ใหม่ ซึ่งทำให้ `@tanstack/react-start` ขึ้นเป็น 1.169 แล้ว build พัง (`Could not resolve entry module "index.html"`)

## สิ่งที่ทำได้

- **Flag metadata:** ชื่อ, คำอธิบาย, Disabled, Track events, Version และประเภท (boolean / string / number / JSON) เมื่อเปลี่ยนประเภท ค่าของ variation จะรีเซ็ตเป็นค่าเริ่มต้นของประเภทนั้น
- **Variations:** เพิ่ม/ลบได้ (ต้องมีอย่างน้อย 2) ช่อง value เปลี่ยนตามประเภท และแต่ละ variation มีสีประจำตัว
- **Targeting rules:**
  - Group ซ้อนกันได้ไม่จำกัดชั้น มี AND/OR และ NOT ระดับ group
  - operator 11 ตัวของ GO Feature Flag (`eq ne lt gt le ge co sw ew in pr`)
  - **ลาก Rule สลับลำดับได้** ด้วยเมาส์และคีย์บอร์ด (`@dnd-kit`) เพราะ rule ถูกตรวจจากบนลงล่าง
- **Serve:** เลือกได้ทั้ง variation เดียว, percentage rollout (แสดงผลรวมแบบ real-time) และ progressive rollout ใช้ได้ทั้งใน rule และ default rule
- **Metadata:** รายการ key/value
- **หลาย flag:** มีปุ่ม Add another flag
- **JSON preview:** Monaco แบบ read-only อัปเดตทุกครั้งที่พิมพ์ เปลี่ยน theme ตาม dark/light และมีปุ่ม Copy / Download `flags.json` พร้อม badge Valid / n errors
- **Error:**
  - ข้อความ error อยู่ใต้ช่องที่ผิด (หลังแตะช่องนั้น หรือหลังกด submit) และใช้ `aria-invalid` / `aria-describedby`
  - มี error summary แสดงตำแหน่งแบบอ่านง่าย เช่น `checkout › Rule 2 › Group › Condition › Field` กดแล้วพาไปที่ช่องนั้น

## โครงสร้าง

```
src/features/feature-flag/
  schemas/flag-form-schema.ts   Form model (interface) + Zod schema และกฎทั้งหมด
  mappers/
    build-query.ts              tree → query string ("role eq \"admin\" and (...)")
    to-go-feature-flag.ts       form → JSON ของ GO Feature Flag (ห่อด้วย "flags")
  hooks/
    form-context.ts             contexts ของ createFormHook
    use-flag-form.ts            useFlagForm + hook ที่ subscribe เฉพาะ "โครง" ของรายการ
    use-flag-snapshot.ts        JSON + issues สำหรับ panel ขวา (useDeferredValue)
  components/                   UI ล้วน (flag-card, variations, targeting, rule-card,
                                query-group (recursive), query-condition, serve-field, ...)
  utils/                        constants, defaults (buildXxx), query-nodes,
                                field-path, issue-path
tests/features/feature-flag/    โครงเดียวกับ src (schemas, mappers, utils, components)
```

ใช้หลัก **Separation of concerns**:

- **Schema:** "ข้อมูลถูกต้องไหม"
- **Mapper:** "แปลงเป็น output อย่างไร" (เป็น pure function ทั้งหมดและมี unit test)
- **Hooks:** "subscribe state อย่างไร"
- **Components:** แสดงผลอย่างเดียว

**การเพิ่มของใหม่:**

- **Operator ใหม่:** เพิ่มใน `OPERATOR_OPTIONS` แล้วจัดรูปค่าใน `build-query.ts`
- **Serve แบบใหม่:** เพิ่ม `SERVE_TYPES`, `refineServe` และ `mapServe`

## การตัดสินใจหลัก

### 1. Output ตาม format จริงของ GO Feature Flag

`expected.json` ในหน้าโจทย์เขียนว่า `"percentage": 50, "variation": "on"` และ `group == 'beta'` แต่ format จริงของ GO Feature Flag เป็นแบบนี้:

- rule เสิร์ฟได้**อย่างใดอย่างหนึ่ง**: `variation`, `percentage` (map ของ variation ไปยังเปอร์เซ็นต์ ที่รวมกันได้ 100) หรือ `progressiveRollout`
- query ใช้ `eq` และ string อยู่ใน quote คู่

ผมเลือก format จริง เพื่อให้ไฟล์ที่ได้นำไปใช้กับ GO Feature Flag ได้ทันที ส่วนที่ยังคงตาม expected.json คือการห่อด้วย `{ "flags": { ... } }` และ key `variations` / `targeting` / `defaultRule`

### 2. Form model ≠ Output model

- **Form:** เก็บเป็น array ที่มี `id` ทุกรายการ เพื่อใช้เป็น React key, ลาก และลบ
- **Output:** เป็น object ที่ใช้ชื่อเป็น key
- **Serve อ้างถึง variation ด้วย `id`** ดังนั้นเปลี่ยนชื่อ variation แล้วทุก rule ยังถูกต้อง โดย mapper แปลงเป็นชื่อตอนสร้าง JSON

### 3. Targeting เก็บแบบ normalized (flat) ไม่ใช่ tree

`DeepKeys` ของ TanStack Form ไม่จำกัดความลึก ถ้า form type เป็น recursive (`Group.children: (Group | Condition)[]`) TypeScript จะ error `TS2589: Type instantiation is excessively deep` ที่ทุก `form.Field`

ทางแก้คือเก็บ node ของแต่ละ rule เป็น array แบน (`nodes[]`) โดยแต่ละ node มี `parentId` เหมือนการ normalize state ใน Redux

- UI ยัง render แบบ recursive (`QueryGroup` เรียกตัวเอง) ได้ไม่จำกัดชั้น
- ชื่อ field ทุกช่องยังมี type ครบ เช่น `flags[0].targeting[1].nodes[3].field` โดย**ไม่ต้อง cast**
- `buildQueryTree` ประกอบกลับเป็น tree ให้ `buildQuery`
- การลบ group ใช้ `collectSubtreeIds` เพื่อลบลูกทั้งหมดไปด้วย

### 4. Validation ด้วย Zod ทุกชั้น

ใช้ `validators: { onChange: flagFormSchema }` ระดับฟอร์ม แล้ว TanStack Form กระจาย issue ไปยัง field ตาม `path`

- **กฎที่ดู field เดียว:** ใช้ schema ปกติ
- **กฎที่ดูหลาย field:** ใช้ `superRefine` เช่น ชื่อ flag/variation ห้ามซ้ำ, ค่าต้องตรงกับประเภท, serve ต้องอ้างถึง variation ที่มีอยู่จริง, percentage ต้องรวมกันได้ 100, วันจบต้องหลังวันเริ่ม, group ห้ามว่าง และ condition ต้องมี field/value (ยกเว้น `pr`)
- **ทำได้ดีกว่า editor ต้นฉบับ:** GO Feature Flag editor สร้าง `and ()` เมื่อ group ว่าง แต่ของเราไม่เขียน group ว่างลง preview และ Zod จะแจ้งให้แก้

### 5. ลดการ re-render

- ทุกช่องเป็น `form.AppField` ของตัวเอง พิมพ์ช่องไหนก็ re-render แค่ช่องนั้น
- รายการต่างๆ (flags, variations, rules, nodes) subscribe แค่ **id ที่ต่อกันเป็น string** (`useListIds`, `useRuleShape`, `useVariationOptions`) จึง re-render เฉพาะตอนเพิ่ม/ลบ/ย้าย ไม่ re-render ตอนพิมพ์
- Panel JSON ใช้ `useDeferredValue` จึงพิมพ์ได้ลื่น แม้ JSON จะยาว

### 6. SSR

ฟอร์มแรกใช้ id ที่คงที่ (`initial-1`, `initial-2`, ...) เพราะ TanStack Start render หน้าเว็บบน server แล้ว hydrate บน browser ถ้าใช้ `crypto.randomUUID()` ค่าของ `<option value>` จะไม่ตรงกันตอน hydrate ส่วนรายการที่ผู้ใช้เพิ่มทีหลังใช้ UUID ได้ เพราะสร้างบน browser

## สิ่งที่แก้ใน template (นอก `your-codes/`)

| ไฟล์                         | เหตุผล                                                                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles.css`             | template มีสีแค่ใน `:root[data-theme='dark']` และไม่ได้ลงทะเบียนสีใน `@theme` ทำให้ `bg-primary`, `bg-card`, `bg-input` ไม่ถูกสร้าง และโหมด Light/Auto ไม่มีสี จึง**เพิ่ม**ชุดสี Light (shadcn neutral), `--radius`, `@theme inline` และ `:root.dark` โดยไม่เปลี่ยนค่าสีเดิม |
| `vitest.config.ts` (ใหม่)    | plugin `tanstackStart()` ใน `vite.config.ts` ทำให้ component test มี React สองชุด (`Invalid hook call`) จึงสร้าง config แยกให้ vitest ใช้ ส่วน dev/build ยังใช้ `vite.config.ts` เหมือนเดิม                                                                                  |
| `tsconfig.json`              | ลบ `"baseUrl": "."` ออก เพราะ TypeScript รุ่นใหม่ (ใน VS Code) ประกาศเลิกใช้แล้ว และจะเลิกรองรับใน TS 7 ส่วน `paths` (`#/*`, `@/*`) ยังทำงานเหมือนเดิม เพราะตั้งแต่ TS 4.1 ไม่ต้องมี `baseUrl`                                                                               |
| `src/components/ui/*` (ใหม่) | `card`, `label`, `native-select`, `switch`, `textarea`, `badge` ต้องเขียนเองตามรูปแบบ `button.tsx` เพราะ `shadcn add` กับ style `radix-nova` พยายามติดตั้ง package ชื่อ `cn`                                                                                                 |
| `package.json`               | เพิ่ม `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`                                                                                                                                                                                                             |

**Select:** ใช้ `<select>` ของ HTML แทน Radix Select เพราะ form นี้มี select จำนวนมาก native select ใช้งานด้วยคีย์บอร์ด/มือถือได้ดี และ test ได้ง่าย

## Test

```
schemas/flag-form-schema.test.ts       24  กฎ validation ทุกข้อ, path ของ error, nested 3 ชั้น
mappers/build-query.test.ts            18  ทุก operator, quote/escape, in-list, nested, NOT
mappers/to-go-feature-flag.test.ts     12  โครงสร้างตาม expected.json, ทุกประเภท, progressive
utils/query-nodes.test.ts               4  flat → tree, ลบทั้ง subtree
utils/issue-path.test.ts                6  ข้อความตำแหน่ง error, DOM id
components/flag-editor.test.tsx         8  preview real-time, error, nested group, submit
```

## สิ่งที่ยังไม่ได้ทำ

- import JSON/YAML กลับเข้าฟอร์ม และ export YAML/TOML
- ลาก condition ภายใน group (ตอนนี้ลากได้เฉพาะ Rule ตามโจทย์)
- เก็บสถานะลง localStorage
- Monaco โหลดจาก CDN (jsdelivr) จึงต้องใช้ internet ถ้าออฟไลน์จะเห็น JSON เป็นข้อความธรรมดาแทน
