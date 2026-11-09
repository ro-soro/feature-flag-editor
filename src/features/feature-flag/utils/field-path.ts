type PathSegment = string | number

/**
 * DOM id of the input for a form path. Field names (`flags[0].key`) and
 * validation issue paths (`['flags', 0, 'key']`) give the same id, which lets
 * the error summary jump to the input that has the problem.
 */
export const buildFieldDomId = (path: string | PathSegment[]) => {
  const text = Array.isArray(path) ? path.join('.') : path
  return `ff-${text.replace(/[[\].]+/g, '-').replace(/-+$/, '')}`
}

/**
 * Element to show for an issue: the input itself, or the closest section
 * that has an id when the issue is about a whole list (e.g. percentages).
 */
export const findIssueElement = (path: PathSegment[]) => {
  for (let length = path.length; length > 0; length--) {
    const element = document.getElementById(
      buildFieldDomId(path.slice(0, length)),
    )
    if (element) return element
  }
  return null
}
