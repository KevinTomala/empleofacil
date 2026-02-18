import { useState } from 'react'

export default function FormDropdown({
  value,
  options = [],
  placeholder = 'Selecciona una opcion',
  disabled = false,
  onChange
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <div
      className="ef-dropdown"
      tabIndex={0}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false)
        }
      }}
    >
      <button
        type="button"
        className="ef-control ef-dropdown-toggle"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
      >
        {selected?.label || placeholder}
      </button>

      {open && !disabled && (
        <div className="ef-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="ef-dropdown-option"
              onClick={() => {
                onChange?.(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
          {!options.length && (
            <p className="px-3 py-2 text-xs text-foreground/60">Sin opciones disponibles</p>
          )}
        </div>
      )}
    </div>
  )
}
