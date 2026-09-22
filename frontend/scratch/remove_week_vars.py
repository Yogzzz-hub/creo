import re

FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove CalendarIcon import
content = content.replace("  Calendar as CalendarIcon,\n", "")

# 2. Remove weekOffset
content = re.sub(r'  const \[weekOffset, setWeekOffset\] = useState\(0\);\n', '', content)

# 3. Remove week variables
content = re.sub(r'  const WEEK_DAY_LABELS = \[.*?\];\n', '', content)
content = re.sub(r'  const TIME_HOURS = \[.*?\];\n', '', content)
content = re.sub(r'  const HOUR_PX = \d+;\n', '', content)

# 4. Remove weekDays
week_days_match = re.search(r'  const weekDays = useMemo\(\(\) => \{.*?\}, \[weekOffset\]\);\n', content, re.DOTALL)
if week_days_match:
    content = content.replace(week_days_match.group(0), '')

# 5. Remove parseTimeToHours
parse_time_match = re.search(r'  function parseTimeToHours\(timeStr\?: string\): number \{.*?\}\n', content, re.DOTALL)
if parse_time_match:
    content = content.replace(parse_time_match.group(0), '')

# 6. Remove getWeekCardStyle
get_style_match = re.search(r'  function getWeekCardStyle\(entry: CalendarEntry\) \{.*?\}\n', content, re.DOTALL)
if get_style_match:
    content = content.replace(get_style_match.group(0), '')

# 7. Remove getWeekDayFilteredEntries
get_entries_match = re.search(r'  const getWeekDayFilteredEntries = \(date: Date\) => \{.*?\}\n', content, re.DOTALL)
if get_entries_match:
    content = content.replace(get_entries_match.group(0), '')

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Unused week view variables removed.")
