# Comprehensive-Mitigation-of-DDoS-Attacks-in-SDN

A project dedicated to provide a comprehensive mitigation of DDoS Attact in software defined network

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Things you need to install the software and how to install them

* JDK
* Floodlight
* mininet
* sFlow-RT
* nodejs

### Installing

A step by step series of examples that tell you have to get a development env running

* [JDK](http://tipsonubuntu.com/2016/07/31/install-oracle-java-8-9-ubuntu-16-04-linux-mint-18/)
* Floodlight
```
$ git clone git://github.com/floodlight/floodlight.git
$ cd floodlight
$ git submodule init
$ git submodule update
$ ant
$ sudo mkdir /var/lib/floodlight
$ sudo chmod 777 /var/lib/floodlight
```
* mininet
```
sudo apt-get install mininet
```
* sFlow-RT
```
wget http://www.inmon.com/products/sFlow-RT/sflow-rt.tar.gz
tar -xvzf sflow-rt.tar.gz
```
* nodejs
```
sudo apt-get install nodejs
```


## Running the tests


### Start floodlight in terminal :

In floodlight dir

```
java -jar target/floodlight.jar
```

### Start mininet

In another terminal

```
./run_mininet.sh
```

### Configure sFlow monitoring on each of the switches

```
sudo ovs-vsctl -- --id=@sflow create sflow agent=eth0  target=\"127.0.0.1:6343\" sampling=10 polling=20 -- -- set bridge s1 sflow=@sflow
```

### Start sFlow-RT

In sflow-rt dir

```
./start.sh
```

## Monitoring

### floodlight webGUI:

http://127.0.0.1:8080/ui/pages/index.html

### sFlow dashboard:

http://localhost:8008/html/index.html


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
