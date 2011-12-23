#!/usr/bin/env python
import re

'''http://colorschemedesigner.com/#0021Tw0w0w0w0'''

colorschemes = {
    'christmas':['FF0000',	'BF3030',  'A60000', 'FF4040', 
                 '00CC00',	'269926'   '008500',	'39E639']

}

if __name__ == "__main__":
    print 'reading from old.css'
    fopen = open('old.css')
    data = fopen.read()
    fopen.close()
    
    print 'grabbing colors from scheme - christmas'
    colors_out = colorschemes['christmas']
    colors_in = sorted(set(re.findall(re.compile('#[A-Z0-9]{6}'),data)))
    data_out = data
    
    print 'subbing colors'
    for z in zip(colors_in,colors_out):
        print z[0][1:],z[1]
        data_out = re.compile(re.compile(z[0][1:])).subn(z[1] + ' !important',data_out)[0]
        print data_out
    
    print 'writing to new.css'
    fopen = open('new.css', 'w')
    fopen.write(data_out)
    
    print 'done'
    
