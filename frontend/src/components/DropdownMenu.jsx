import React from "react";

const MENU_CONTAINER_BASE =
  "max-w-[calc(100vw-theme(spacing.4)*2)] min-w-[--trigger-width] flex flex-col overflow-clip isolate relative rounded-md bg-ceramic-menu ring-1 ring-[#191c21]/[.08] shadow-[0_16px_36px_-6px_theme(colors.ceramic.black/.07),0_6px_16px_-2px_theme(colors.ceramic.black/.2)]";

const MENU_CONTENT_BASE =
  "p-[--menu-p] [--menu-p:theme(spacing.1)] data-[slot=separator]:*:-mx-[--menu-p] data-[slot=separator]:*:my-[--menu-p] data-[slot=separator]:*:h-px data-[slot=separator]:*:bg-ceramic-gray-200";

const MENU_ITEM_BASE =
  "group/menu-item grid w-full cursor-pointer items-start gap-2 rounded-[0.375rem] px-2 py-1 text-left grid-cols-[1rem_1fr]";

const MENU_ITEM_NEUTRAL =
  "[--menu-icon-color:theme(colors.ceramic.gray.800)] [--menu-icon-hover-color:theme(colors.ceramic.primary)] [--menu-label-color:theme(colors.ceramic.primary)]";

const MENU_ITEM_NEGATIVE =
  "[--menu-icon-color:theme(colors.ceramic.negative)] [--menu-icon-hover-color:theme(colors.ceramic.negative)] [--menu-label-color:theme(colors.ceramic.negative)]";

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

export function DropdownMenu({
  open,
  width = "16.0625rem",
  maxHeight = "520px",
  className,
  style,
  children,
}) {
  if (!open) return null;
  return (
    <div
      className={classNames(MENU_CONTAINER_BASE, className)}
      style={{
        position: "absolute",
        zIndex: 100000,
        maxHeight,
        "--trigger-width": "24px",
        width,
        ...style,
      }}
      role="dialog"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

export function DropdownMenuContent({ className, children, ...props }) {
  return (
    <div
      className={classNames(MENU_CONTENT_BASE, className)}
      role="menu"
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSection({ label, children, ...props }) {
  return (
    <section role="group" aria-label={label} {...props}>
      {children}
    </section>
  );
}

export function DropdownMenuSeparator({ className, ...props }) {
  return (
    <div
      data-slot="separator"
      role="separator"
      className={classNames("react-aria-Separator", className)}
      {...props}
    />
  );
}

export function DropdownMenuItem({
  as: Component = "button",
  variant = "neutral",
  icon,
  className,
  children,
  role = "menuitem",
  ...props
}) {
  const isButton = Component === "button";
  const variantClass =
    variant === "negative" ? MENU_ITEM_NEGATIVE : MENU_ITEM_NEUTRAL;

  return (
    <Component
      className={classNames(MENU_ITEM_BASE, variantClass, className)}
      role={role}
      {...(isButton ? { type: "button" } : {})}
      {...props}
    >
      {icon ? icon : <span className="mt-0.5 size-4" aria-hidden="true" />}
      <span className="min-w-0 col-start-2">{children}</span>
    </Component>
  );
}
