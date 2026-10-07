import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";

type Option = { value: string; label: string; disabled: boolean };
function optionsFrom(children: ReactNode, disabled = false): Option[] {
  const result: Option[] = [];
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === "option") {
      const label = child.props.label || Children.toArray(child.props.children).join("");
      result.push({ value: String(child.props.value ?? label), label, disabled: disabled || !!child.props.disabled });
    } else if (child.type === Fragment || child.type === "optgroup") {
      result.push(...optionsFrom(child.props.children, disabled || !!child.props.disabled));
    }
  });
  return result;
}

/** Styled single select retaining native change events, FormData, required validation and reset. */
export function NativeSelect({ children, className, value, defaultValue, onChange, onInvalid, id, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = optionsFrom(children);
  const generatedId = useId();
  const emptyValue = `${generatedId}-empty`;
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const [invalid, setInvalid] = useState(false);
  const [fieldLabel, setFieldLabel] = useState<string>();
  const selected = String(value ?? internal);
  useEffect(() => {
    const element = native.current;
    const form = element?.form;
    const label = element?.previousElementSibling;
    if (label?.tagName === "LABEL") setFieldLabel(label.textContent?.trim());
    const reset = () => queueMicrotask(() => { setInternal(element?.value ?? ""); setInvalid(false); });
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, []);
  // Multiple/list selects retain their native selection semantics.
  if (props.multiple || (props.size && props.size > 1)) {
    return <select {...props} id={id} className={className} value={value} defaultValue={defaultValue} onChange={onChange}>{children}</select>;
  }
  return <>
    <select {...props} ref={native} id={id ? `${id}-native` : undefined} value={value} defaultValue={defaultValue} tabIndex={-1} aria-hidden="true" className="creo-native-select" onChange={event => { setInternal(event.target.value); setInvalid(false); onChange?.(event); }} onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); onInvalid?.(event); }}>
      {children}
    </select>
    <Select value={selected || emptyValue} disabled={props.disabled} onValueChange={next => {
      if (!native.current) return;
      native.current.value = next === emptyValue ? "" : next;
      native.current.dispatchEvent(new Event("change", { bubbles: true }));
    }}>
      <SelectTrigger ref={trigger} id={id} className={className} title={options.find(option => option.value === selected)?.label} aria-label={props["aria-label"] || fieldLabel || props.name || "Select option"} aria-labelledby={props["aria-labelledby"]} aria-describedby={invalid ? `${generatedId}-error` : props["aria-describedby"]} aria-required={props.required} aria-invalid={invalid || props["aria-invalid"]}>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value || emptyValue} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
    {invalid && <span id={`${generatedId}-error`} role="alert" className="text-xs text-[#D8BF9B]">Please select an option.</span>}
  </>;
}
