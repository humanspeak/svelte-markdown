#!/bin/bash

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
SRC_DIR="src"
DRY_RUN=false
MAX_JOBS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

# Help function
show_help() {
	echo "Usage: $0 [OPTIONS] 🛠️"
	echo "Find and optionally remove unused Svelte components. 🧹"
	echo
	echo "Options:"
	echo "  -h, --help     Show this help message 📖"
	echo "  -d, --dir      Specify source directory (default: src) 📁"
	echo "  --dry-run      Show what would be deleted without actually deleting 🔍"
	echo "  -j, --jobs     Number of parallel jobs (default: auto) 🚀"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
	case $1 in
	-h | --help)
		show_help
		exit 0
		;;
	-d | --dir)
		SRC_DIR="$2"
		shift
		;;
	--dry-run) DRY_RUN=true ;;
	-j | --jobs)
		MAX_JOBS="$2"
		shift
		;;
	*)
		echo "Unknown parameter: $1"
		show_help
		exit 1
		;;
	esac
	shift
done

# Verify source directory exists
if [[ ! -d ${SRC_DIR} ]]; then
	echo -e "${RED}Error: Directory '${SRC_DIR}' not found ❌${NC}"
	exit 1
fi

COMPONENTS_JSON="${SRC_DIR}/../components.json"
SHADCN_DIR=""

# Check for components.json and get shadcn components directory
if [[ -f ${COMPONENTS_JSON} ]]; then
	echo -e "${YELLOW}Found components.json - will exclude shadcn components 🎯${NC}"
	# Extract the components directory from components.json using grep and cut
	if grep_result=$(grep -o '"components": *"[^"]*"' "${COMPONENTS_JSON}"); then
		SHADCN_DIR=$(echo "${grep_result}" | cut -d'"' -f4)
	fi
	if [[ -n ${SHADCN_DIR} ]]; then
		# Remove $lib prefix if present
		SHADCN_DIR=${SHADCN_DIR/\$lib\//}
		SHADCN_DIR="${SRC_DIR}/lib/${SHADCN_DIR}/ui"
		echo -e "${YELLOW}Excluding components in: ${SHADCN_DIR} 📂${NC}"
	fi
fi

# Create a temporary file to store results
declare temp_file
temp_file=$(mktemp)
trap 'rm -f "$temp_file"' EXIT

echo -e "${NC}Scanning ${SRC_DIR} folder to find all .svelte files 🔎"
echo -e "  ${GREEN}.${NC} means the .svelte is imported in another file ✅"
echo -e "  ${RED}x${NC} means the .svelte is not imported and should likely be removed ❌"

# Number of concurrent processes
MAX_JOBS=8

# Process files with controlled concurrency
process_file() {
	local svelte_file="$1"
	# Declare filename first
	local filename
	# Then assign value separately
	filename=$(basename -- "${svelte_file}")

	# skip files starting with '+' or in node_modules
	if [[ ${filename} == +* ]] || [[ ${svelte_file} == *"node_modules"* ]]; then
		echo "${svelte_file}:used" >>"${temp_file}"
		echo -n -e "${GREEN}.${NC}"
		return
	fi

	# Search for the component name without extension
	local component_name="${filename%.svelte}"
	local found=""
	if grep_result=$(grep -rl -E "import.*${component_name}($|[^a-zA-Z])|<${component_name}($|[^a-zA-Z-])" "${SRC_DIR}"); then
		found=$(echo "${grep_result}" | grep -v "^${svelte_file}$" || true)
	fi

	if [[ -z ${found} ]]; then
		echo "${svelte_file}:unused" >>"${temp_file}"
		echo -n -e "${RED}x${NC}"
	else
		echo "${svelte_file}:used" >>"${temp_file}"
		echo -n -e "${GREEN}.${NC}"
	fi
}

# Find and process files
count=0
if [[ -n ${SHADCN_DIR} ]]; then
	while IFS= read -r file || [[ -n ${file} ]]; do
		process_file "${file}" &
		((count++))

		# Wait if we've reached MAX_JOBS
		if ((count % MAX_JOBS == 0)); then
			wait
		fi
	done < <(find "${SRC_DIR}" -type f -name "*.svelte" -not -path "${SHADCN_DIR}/*" || true)
else
	while IFS= read -r file || [[ -n ${file} ]]; do
		process_file "${file}" &
		((count++))

		# Wait if we've reached MAX_JOBS
		if ((count % MAX_JOBS == 0)); then
			wait
		fi
	done < <(find "${SRC_DIR}" -type f -name "*.svelte" || true)
fi

# Wait for remaining jobs
wait

# Print a newline after progress dots
echo
echo

# Create a temporary file to store results
declare temp_file
temp_file=$(mktemp)

# Read results and display progress
unused_files=()
while IFS=: read -r file status; do
	if [[ ${status} == "unused" ]]; then
		echo -n -e "${RED}x${NC}"
		unused_files+=("${file}")
	else
		echo -n -e "${GREEN}.${NC}"
	fi
done <"${temp_file}"

# Clean up temporary file
rm "${temp_file}"

# Print unused files
if [[ ${#unused_files[@]} -eq 0 ]]; then
	echo -e "${GREEN}No unused components found. All clean! 🎉${NC}"
	exit 0
fi

for file in "${unused_files[@]}"; do
	echo -e "${RED}Unused Svelte file: ${file} 🗑️${NC}"
done

# Handle file deletion
if [[ ${#unused_files[@]} -gt 0 ]]; then
	echo -e "\nFound ${#unused_files[@]} unused components:"
	for file in "${unused_files[@]}"; do
		echo -e "${RED}  - ${file}${NC}"
	done

	if [[ ${DRY_RUN} == true ]]; then
		echo -e "${YELLOW}Dry run: Files would be deleted 🔍${NC}"
		exit 0
	fi

	echo -e -n "${GREEN}Do you want to delete these ${#unused_files[@]} files? (y/N) 🗑️ ${NC}"
	read -r answer

	if [[ ${answer} =~ ^[Yy] ]]; then
		deleted=0
		failed=0
		for file in "${unused_files[@]}"; do
			if rm "${file}"; then
				echo -e "${GREEN}Deleted: ${file} ✅${NC}"
				((deleted++))
			else
				echo -e "${RED}Failed to delete: ${file} ❌${NC}"
				((failed++))
			fi
		done
		echo -e "\n${GREEN}Summary: Deleted ${deleted} files, Failed to delete ${failed} files${NC}"
	else
		echo -e "${YELLOW}Operation cancelled by user${NC}"
	fi
fi
