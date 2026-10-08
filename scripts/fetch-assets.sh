#!/usr/bin/env bash
# One-time import of the images used by offbroadwaylive.com on Wix.
#
# Run from the repo root on a machine that can reach static.wixstatic.com:
#   bash scripts/fetch-assets.sh
# then commit src/assets/images so the build never depends on Wix.
#
# Files are saved under src/assets/images (not public/) so Astro's image
# pipeline can resize them and convert photos to WebP at build time. Any
# image that is missing is shown as a labelled placeholder on the site, so
# the build works before, during and after this import.
#
# On an error the script keeps going and lists every failure at the end.

set -u
cd "$(dirname "$0")/.."

OUT="src/assets/images"
BASE="https://static.wixstatic.com/media"
FALLBACK_SUFFIX="v1/fill/w_1600,h_1600,al_c,q_90/file.jpg"
failures=()

fetch() {
  local dest="$1" media="$2"
  local path="$OUT/$dest"
  mkdir -p "$(dirname "$path")"
  if curl -fsSL --retry 2 -o "$path.tmp" "$BASE/$media"; then
    mv "$path.tmp" "$path"; echo "ok    $dest"; return
  fi
  if curl -fsSL --retry 2 -o "$path.tmp" "$BASE/$media/$FALLBACK_SUFFIX"; then
    mv "$path.tmp" "$path"; echo "ok    $dest (resized fallback)"; return
  fi
  rm -f "$path.tmp"
  echo "FAIL  $dest"
  failures+=("$dest  <-  $BASE/$media")
}

# Logo, show art, venue photos
fetch logo/obl-logo.png          "f205a0_b8334bf8ee1641979894668a2cce2baf~mv2.png"
fetch shows/lionel-poster.png    "f205a0_f2a604a5b4d24b2994bd282a3fce87d9~mv2.png"
fetch shows/lionel-wide.jpg      "f205a0_01f34a1391fe44238cb53b30b80ff5a5~mv2.jpg"
fetch shows/bestof26-poster.png  "f205a0_7292e3c2a8154167aac6b4ca474a9374~mv2.png"
fetch shows/bestof26-wide.jpg    "f205a0_c9d9c4c60b7b40b6a2afe802fcd1c6f6~mv2.jpg"
fetch shows/christmas-wide.png   "f205a0_2dc68d782dd6469d8c63c6748a73153d~mv2.png"
fetch venue/seating-chart.png    "f205a0_216a0e4a06de4137a8407adfae873048~mv2.png"
fetch venue/end-of-show.jpg      "f205a0_119053e64eb8410a8e3a1e41640d29c8~mv2_d_2016_1512_s_2.jpg"
fetch venue/jukebox.jpg          "f205a0_b5f6ff6ddcb944e68edc8310a6a2c9c1~mv2.jpg"
fetch venue/rat-pack-stage.jpg   "f205a0_b4a6ae98fee94bb2a43ad036feb8989f~mv2.jpg"

# Gallery, saved as gallery/01.jpg onward in this order.
# The saved extension is always .jpg; .jpeg sources are JPEG too.
gallery=(
  334f44fd1b6742639afccfa58a04aa41.jpeg d59f117ef8ee45348c0c5a1678b86df5.jpeg
  58147c7b5fad4051b453adff26f71cd0.jpg  5467076ffbd944e19a7c437de17d492f.jpg
  e18a4be45d1d42538ab31dda580f6b7d.jpg  1984631f38e042b5bda330f1ed7e86fd.jpg
  4a0bb5fb63da4f1fb3858cac6048c2b1.jpg  22525e0a110d471fbea1180f2633c2a4.jpg
  a3d929c631b64fb6a9f0c339cb7c2999.jpg  6ab8c0b96e464ca7be59ea8dec2c5dad.jpg
  3758c35f11fb4c24a4f0573cf5d36870.jpg  be0e966ff88149429e43b10c7e67076e.jpg
  218513c8f7a04a3e8269e7e82d27749f.jpg  5ef8d2560d0f4039a0fbd10f6da9ac2b.jpg
  852d8459dd054ff5b799ed641ed156ae.jpg  7fa2110d4dee4cb5872c9b9e453bbac6.jpeg
  9399fd5ae2fd4377a77f51bdd34ea5f5.jpeg 01fac332a69a453ab860fae905bec8f8.jpg
  f81ec759bc6346bd8f92029a4ef1f80a.jpg  261d4edf186d438eb8daa14d82c8c724.jpeg
  42389872f891431eb381157a7669bf35.jpg  651998a4818243ec8507c8f1d47633ab.jpeg
  dc29dde7618f49879e946d371b607b39.jpeg c9b04dae082c464c9e5a09f9c64e07db.jpg
  f7a1e45865414dab8d007d3b6deaaa7a.jpg
)
n=1
for file in "${gallery[@]}"; do
  hash="${file%.*}"; ext="${file##*.}"
  fetch "gallery/$(printf '%02d' "$n").jpg" "f205a0_${hash}~mv2.${ext}"
  n=$((n + 1))
done

echo
if [ ${#failures[@]} -eq 0 ]; then
  echo "All files downloaded. Commit src/assets/images."
else
  echo "${#failures[@]} download(s) failed; the site shows a placeholder for each:"
  printf '  %s\n' "${failures[@]}"
  exit 1
fi
