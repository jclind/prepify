export const selectCustomStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    background: '#eeeeee',
    minHeight: '40px',
    height: '40px',
    boxShadow: state.isFocused ? null : null,
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: 'hsl(0, 0%, 0%)',
    fontWeight: '500',
    paddingBottom: '3px',
  }),

  valueContainer: (provided: any) => ({
    ...provided,
    height: '40px',
    padding: '0 6px',
  }),

  input: (provided: any) => ({
    ...provided,
    margin: '0px',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    height: '40px',
  }),
}
