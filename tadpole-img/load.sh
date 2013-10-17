{
  find data/Tadpole/Tioga/images_Tioga_2010SPUDS/ -name *.png
  find data/Tadpole/Tioga/images_Tioga_2008SPUDS/ -name *.png
} | head -n 5 | while read name; do
  basename="$(basename "$name" .png)"
  dirname="$(dirname "$name")"
  data="$(
    grep ",$basename\$" "$dirname/coordinates.csv" |
    tr "," " " |
    {
      read lng lat date filename;
      echo "\"longitude\":$lng,\"latitude\":$lat,\"date\":\"$date\"";
    }
  )"
  ./createTasks.py "$@" -a tadpole-img -t "{\"url\":\"https://s3-us-west-2.amazonaws.com/drillpadcat/$name\",$data}"
done
