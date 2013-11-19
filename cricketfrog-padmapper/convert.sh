find "$1" -name "*.txt" |
  while read file; do
    {
      echo -n "["
      first=true
      tail -n +2 $file |
        recode text/cr-lf..text |
        tr "	" "," |
        sed -e "s+ \([0-9]*\)$+,\1+g" |
        while IFS="," read longitude latitude year county url siteID bbox width height rest; do
          if [ "$first" != "true" ]; then echo -n ","; fi
          first=false
          bbox="$(echo $bbox | sed -e "s+\([-.0-9]*\) \([-.0-9]*\) \([-.0-9]*\) \([-.0-9]*\)$+\3,\4,\1,\2+g")"
          echo -n "{\"url\": \"$url\", \"bbox\": \"$bbox\", \"width\": $width, \"height\": $height, \"siteID\":\"$siteID\"}"
        done
      echo "]"
    } > "$(echo "$file" | sed -e "s+.txt$+.json+g")";
  done
