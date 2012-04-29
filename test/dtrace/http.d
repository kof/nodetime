#pragma D option quiet

api-call-start
{
  ts[args[0]] = timestamp;
  vts[args[0]] = vtimestamp;
}

api-call-done
{
  @t[args[2]] = quantize(timestamp - ts[args[0]]);
  @v[args[2]] = quantize(vtimestamp - vts[args[0]]);
}

tick-10sec
{
  printf("Wall time:\n");
  printa(@t);

  printf("CPU time:\n");
  printa(@v);
}
