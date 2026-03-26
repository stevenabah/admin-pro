# Admin-Pro UI/UX Design Specification

# Admin-Pro UI/UX 设计规范

## 1. Design Overview / 设计概述

- **Style**: Enterprise-grade admin system — clean, professional, efficient
- **Theme**: Element Plus Default (blue primary) with custom refinements
- **Palette**: Based on Element Plus default theme, with darker sidebar and accent improvements
- **Typography**: System font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif)

## 2. Color System / 色彩体系

### Primary Colors

| Token                      | Hex     | Usage                                 |
| -------------------------- | ------- | ------------------------------------- |
| `--color-primary`          | #409eff | Primary buttons, links, active states |
| `--color-primary-light`    | #66b1ff | Hover states                          |
| `--color-primary-lighter`  | #a0cfff | Light backgrounds                     |
| `--color-primary-dark`     | #337ecc | Pressed states                        |
| `--color-primary-lightest` | #ecf5ff | Row hover, selected rows              |

### Semantic Colors

- Success: #67c23a
- Warning: #e6a23c
- Danger: #f56c6c
- Info: #909399

### Neutrals

- Background (page): #f0f2f5
- Sidebar: linear-gradient(180deg, #1e1e1e → #2d2d2d)
- Text primary: #303133
- Text regular: #606266
- Text secondary: #909399
- Border: #dcdfe6
- Border light: #ebeef5

## 3. Layout System / 布局体系

### Main Layout

- **Sidebar (Aside)**: 200px width, dark gradient background
  - Logo area: 60px height, slightly darker
  - Menu items: 48px height, 6px border-radius, 8px horizontal margin
  - Active item: left 3px blue border + light blue gradient background
  - Hover: light blue transparent background
- **Header**: 60px height, white background, 1px bottom shadow
  - Breadcrumb navigation (left)
  - Fullscreen, Bell, User avatar, Settings (right)
- **Content (Main)**: #f0f2f5 background, 20px padding

### Login Page

- Centered card: 420px width, 12px border-radius
- Header: gradient blue background (#409eff → #337ecc) with icon + title + subtitle
- Tab switch: Login / Register toggle (white tinted radio buttons)
- Form: standard spacing, 6px input border-radius
- Button: 40px height, full width, 2px letter spacing

### User Management Page

- Card container: 8px border-radius, subtle shadow
- Search bar: inline form layout
- Table: striped rows, hover highlight (#ecf5ff)
- Action buttons: small size (6px 12px padding)
- Dialog: 500px width, full-width form with 80px label width

## 4. Typography / 字体规范

- **Headings**: System font, bold weight
  - H1: 24px (login title)
  - H2: 20px (section titles)
  - H3: 18px (sidebar logo)
- **Body**: 14px, #606266
- **Labels**: 13px, font-weight 500
- **Small/Hints**: 12px, #909399
- **Table header**: 13px, font-weight 600, #606266

## 5. Spacing / 间距规范

- **Base unit**: 4px
- **Component padding**: 12px–20px
- **Card padding**: 16px body, 14px header
- **Form item margin**: 18px bottom
- **Button height**: 32px (default), 40px (large)

## 6. Shadows / 阴影

- Card: `0 2px 12px rgba(0,0,0,0.04)`
- Dialog: `0 8px 32px rgba(0,0,0,0.08)`
- Dropdown: `0 4px 12px rgba(0,0,0,0.08)`

## 7. Border Radius / 圆角

- Small (tags, inputs): 4px
- Medium (buttons, inputs): 6px
- Large (tables, cards): 8px
- Extra large (dialog): 12px

## 8. Animation / 动效

- Fast (hover): 0.15s ease
- Normal (transitions): 0.25s ease
- Sidebar collapse: 0.3s

## 9. Component Design Details / 组件设计详情

### Buttons

- Primary: filled #409eff, white text
- Default: white bg, #dcdfe6 border
- Danger: filled #f56c6c
- All: 6px radius, 500 font-weight

### Inputs

- Border: 1px #dcdfe6 inset
- Focus: 1px #409eff inset
- Radius: 6px
- Height: default 32px, large 40px

### Tables

- Striped rows (alternate #fafafa)
- Hover row: #ecf5ff
- Active cell border-bottom: #f0f0f0
- Header: #fafafa background

### Dialog

- Radius: 12px
- Header border-bottom: 1px #f0f0f0
- Footer border-top: 1px #f0f0f0

### Tags

- Radius: 4px
- Status tags: success (green), danger (red)

## 10. Accessibility / 无障碍

- Focus states visible on all interactive elements
- Color contrast meets WCAG AA
- Keyboard navigation support via Element Plus defaults
- Meaningful labels on icon-only buttons (el-tooltip)
