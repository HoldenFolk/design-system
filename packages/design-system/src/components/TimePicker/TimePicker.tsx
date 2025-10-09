import * as React from 'react';

import { Clock } from '@strapi/icons';
import { styled } from 'styled-components';

import { useControllableState } from '../../hooks/useControllableState';
import { useDateFormatter } from '../../hooks/useDateFormatter';
import { useDesignSystem } from '../../utilities/DesignSystemProvider';
import { Combobox, ComboboxProps, ComboboxInputElement, ComboboxOption } from '../Combobox/Combobox';

const isNotAlphabeticalCharacter = (str: string): boolean => {
  return Boolean(str.match(/^[^a-zA-Z]*$/));
};

function escapeForRegex(str = '') {
  // Escape anything that could be special in a regex
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* -------------------------------------------------------------------------------------------------
 * TimePicker
 * -----------------------------------------------------------------------------------------------*/

export interface TimePickerProps
  extends Omit<
    ComboboxProps,
    | 'children'
    | 'autocomplete'
    | 'startIcon'
    | 'placeholder'
    | 'allowCustomValue'
    | 'onFilterValueChange'
    | 'filterValue'
    | 'value'
    | 'defaultValue'
    | 'defaultTextValue'
    | 'textValue'
    | 'onTextValueChange'
  > {
  /**
   * @default 15
   */
  step?: number;
  value?: string;
  defaultValue?: string;
}

const TimePickerCombobox = styled(Combobox)`
  min-width: ${({ onClear }) => (onClear ? '160px' : '130px')};
`;

export const TimePicker = React.forwardRef<ComboboxInputElement, TimePickerProps>(
  ({ step = 15, value: valueProp, defaultValue, onChange, ...restProps }, forwardedRef) => {
    const context = useDesignSystem('TimePicker');

    const [textValue, setTextValue] = React.useState<string | undefined>('');

    const [value, setValue] = useControllableState({
      prop: valueProp,
      defaultProp: defaultValue,
      onChange,
    });

    const formatter = useDateFormatter(context.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const separator = React.useMemo(() => {
      const parts = formatter.formatToParts(new Date());
      const { value: separator } = parts.find((part) => part.type === 'literal')!;

      return separator;
    }, [formatter]);

    // Enable virtualization for small steps that generate many options
    // step=1 -> 1440 options, step=5 -> 288 options
    const shouldVirtualize = step <= 5;

    // Increase overscan for smoother scrolling with many items
    const overscanCount = step === 1 ? 15 : 10;

    // For virtualized lists, generate options lazily to avoid creating 1440 React elements upfront
    // For non-virtualized lists, generate all options as before
    const timeOptions = React.useMemo(() => {
      if (!shouldVirtualize) {
        // Non-virtualized: generate all options as before
        const stepCount = 60 / step;
        return [...Array(24).keys()].flatMap((hour) =>
          [...Array(stepCount).keys()].map((minuteStep) =>
            formatter.format(new Date(0, 0, 0, hour, minuteStep * step)),
          ),
        );
      }

      // Virtualized: return empty array and generate on-demand
      return [];
    }, [step, formatter, shouldVirtualize]);

    // Generate time option on demand for virtualized lists
    const getTimeOption = React.useCallback(
      (index: number) => {
        const stepCount = 60 / step;
        const hour = Math.floor(index / stepCount);
        const minuteStep = index % stepCount;
        return formatter.format(new Date(0, 0, 0, hour, minuteStep * step));
      },
      [step, formatter],
    );

    // Calculate total count for virtualized lists
    const totalTimeCount = (60 / step) * 24;

    const handleTextValueChange = (string?: string) => {
      if (!string || isNotAlphabeticalCharacter(string)) {
        setTextValue(string);
      }
    };

    const createNewTimeValue = (value: string) => {
      const [hours, minutes] = value.split(separator);

      if (!hours && !minutes) return undefined;

      const hoursAsNumber = Number(hours ?? '0');
      const minutesAsNumber = Number(minutes ?? '0');

      if (hoursAsNumber > 23 || minutesAsNumber > 59) return undefined;

      return formatter.format(new Date(0, 0, 0, hoursAsNumber, minutesAsNumber));
    };

    const handleBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
      const newValue = createNewTimeValue(event.target.value);

      if (newValue) {
        setTextValue(newValue);
        setValue(newValue);
      } else {
        setTextValue(value);
      }
    };

    const handleChange = (changedValue?: string) => {
      if (typeof changedValue !== 'undefined') {
        const newValue = createNewTimeValue(changedValue);

        setValue(newValue);
      } else {
        setValue(changedValue);
      }
    };

    /**
     * Because we allow values that aren't necessarily in the list & we control the text value, we need to
     * update the text value when the value changes to keep the two in sync.
     */
    React.useEffect(() => {
      const actualValue = typeof valueProp === 'undefined' ? '' : valueProp;

      if (isNotAlphabeticalCharacter(actualValue)) {
        setTextValue(actualValue);
      }
    }, [valueProp, setTextValue]);

    const escapedSeparator = escapeForRegex(separator);
    const pattern = `\\d{2}${escapedSeparator}\\d{2}`;

    // Render function for lazy virtualization
    const renderTimeOption = React.useCallback(
      (index: number) => {
        const time = getTimeOption(index);
        return (
          <ComboboxOption key={time} value={time}>
            {time}
          </ComboboxOption>
        );
      },
      [getTimeOption],
    );

    return (
      <TimePickerCombobox
        {...restProps}
        ref={forwardedRef}
        value={value}
        onChange={handleChange}
        isPrintableCharacter={isNotAlphabeticalCharacter}
        allowCustomValue
        placeholder={`--${separator}--`}
        autocomplete="none"
        startIcon={<Clock fill="neutral500" />}
        inputMode="numeric"
        pattern={pattern}
        textValue={textValue}
        onTextValueChange={handleTextValueChange}
        onBlur={handleBlur}
        virtualized={shouldVirtualize}
        overscan={overscanCount}
        virtualItemCount={shouldVirtualize ? totalTimeCount : undefined}
        renderVirtualItem={shouldVirtualize ? renderTimeOption : undefined}
      >
        {!shouldVirtualize &&
          timeOptions.map((time) => (
            <ComboboxOption key={time} value={time}>
              {time}
            </ComboboxOption>
          ))}
      </TimePickerCombobox>
    );
  },
);
