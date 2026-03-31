"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import * as Select from "@radix-ui/react-select";

const locales = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
];

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Select.Root
      value={locale}
      onValueChange={(value) => {
        router.replace(pathname, { locale: value });
      }}
    >
      <Select.Trigger className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-neutral-300 hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none">
        <Select.Value />
        <Select.Icon>
          <ChevronDown />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg)] shadow-lg"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="p-1">
            {locales.map(({ value, label }) => (
              <Select.Item
                key={value}
                value={value}
                className="relative flex cursor-pointer items-center rounded px-6 py-1.5 text-xs text-neutral-300 outline-none hover:bg-neutral-800 hover:text-white data-[highlighted]:bg-neutral-800 data-[highlighted]:text-white"
              >
                <Select.ItemIndicator className="absolute left-1">
                  <Check />
                </Select.ItemIndicator>
                <Select.ItemText>{label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
