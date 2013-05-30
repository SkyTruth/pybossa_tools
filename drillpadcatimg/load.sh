{
  find data/Tioga/images_Tioga_2010SPUDS/ -name *.png
  find data/Tioga/images_Tioga_2008SPUDS/ -name *.png
} | while read name; do
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
  ./createTasks.py -s http://crowdcrafting.org -k 3e01d1a2-1efa-47e4-82db-b8dd669f336d -a drillpadcatimg -t "{\"url\":\"https://s3-us-west-2.amazonaws.com/drillpadcat/$name\",$data}"
done