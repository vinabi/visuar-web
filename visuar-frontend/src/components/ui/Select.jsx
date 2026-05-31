import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "../../context/ThemeContext";

const Select = React.forwardRef(
  (
    {
      className,
      options = [],
      value,
      onChange,
      placeholder = "Select...",
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef(null);
    const { isDarkMode } = useTheme();

    const selectedOption = options.find((opt) => opt.value === value);

    React.useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
      onChange({ target: { value: optionValue, name: props.name } });
      setIsOpen(false);
    };

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={ref}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full h-12 items-center justify-between rounded-xl border px-4 py-2 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500 transition-colors",
            isDarkMode
              ? "border-slate-600 bg-slate-800/50 hover:border-cyan-400/50"
              : "border-slate-300 bg-white hover:border-cyan-400",
            !value && (isDarkMode ? "text-white" : "text-slate-500"),
            value &&
              (isDarkMode
                ? "font-semibold text-white"
                : "font-semibold text-slate-900"),
            className
          )}
          {...props}
        >
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isDarkMode ? "text-slate-400" : "text-slate-500",
              isOpen && "transform rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div
            className={cn(
              "absolute z-50 w-full mt-1 border rounded-xl shadow-lg overflow-hidden",
              isDarkMode
                ? "bg-slate-800 border-slate-700 divide-y divide-slate-700"
                : "bg-white border-slate-200 divide-y divide-slate-100"
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "w-full px-4 py-3 text-left text-base transition-all duration-150",
                  value === option.value
                    ? "bg-cyan-500 text-white font-semibold"
                    : isDarkMode
                    ? "bg-slate-800 text-slate-200 hover:bg-cyan-500 hover:text-white"
                    : "bg-white text-slate-700 hover:bg-cyan-500 hover:text-white"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
