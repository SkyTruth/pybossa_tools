find . -name "*.txt" |
  while read file; do
    {
      echo -n "["
      first="yes"
      tail -n +2 $file |
        while IFS=, read longitude latitude year country url siteID rest; do
          if [ "$first" != "yes" ]; then
            echo -n ","
          fi
          first="no"
          echo -n "{\"url\": \"$url\", \"longitude\": \"$longitude\", \"county\": \"$county\", \"siteID\": \"$siteID\", \"year\": \"$year\", \"latitude\": \"$latitude\"}"
        done
      echo "]"
    } > $file.json
  done
