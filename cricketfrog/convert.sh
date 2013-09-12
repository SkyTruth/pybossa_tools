find "$1" -name "*.txt" |
  while read file; do
    tail -n +2 $file |
      recode text/cr-lf..text |
      tr "	" "," |
      sed -e "s+ \([0-9]*\)$+,\1+g" |
      while IFS="," read longitude latitude year county url siteID bbox width height rest; do
        bbox="$(echo $bbox | tr " " ",")"
        echo "{\"url\": \"$url\", \"bbox\": \"$bbox\", \"width\": $width, \"height\": $height, \"siteID\":\"$siteID\"}"
      done > "$(echo "$file" | sed -e "s+.txt$+.json+g")";
  done
