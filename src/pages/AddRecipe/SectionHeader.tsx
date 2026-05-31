import React, { FC } from 'react'

interface SectionHeaderProps {
  label: string
  // Marks the section as required, surfacing a small "Required" tag beside the
  // divider. Optional sections (cook time, cuisine) omit it.
  required?: boolean
}

// Section label styled as the recipe-page pattern: an orange uppercase label
// followed by a divider rule. Kept as an <h2> so screen-reader users can still
// navigate the form by heading.
const SectionHeader: FC<SectionHeaderProps> = ({ label, required = false }) => (
  <h2 className='section-header'>
    <span className='text'>{label}</span>
    <span className='divider' aria-hidden='true' />
    {required && <span className='req'>Required</span>}
  </h2>
)

export default SectionHeader
